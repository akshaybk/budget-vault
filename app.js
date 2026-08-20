const $=s=>document.querySelector(s);

const fmt=n=>new Intl.NumberFormat('en-IN',{
  style:'currency',
  currency:'INR',
  maximumFractionDigits:2
}).format(n||0);

const defaults=[
  'Groceries','Housing','Transport','Dining','Shopping',
  'Bills','Health','Entertainment','Other'
];

const config=window.BUDGET_VAULT_CONFIG||{};

let db,user,budget=0,categories=[],expenses=[],isRegister=true;
let authRedirecting=false;

const configured=()=>config.supabaseUrl?.startsWith('https://')&&!config.supabaseAnonKey?.startsWith('PASTE_');

function esc(v){
  const n=document.createElement('div');
  n.textContent=v||'';
  return n.innerHTML;
}

function showError(message){
  $('#authHint').textContent=message;
  $('#authHint').style.color='#bf4d58';
}

function showConfirmation(){
  const toast=$('#confirmationToast');
  toast.hidden=false;
  window.setTimeout(()=>{ toast.hidden=true; },7000);
}

function clearAuthRedirect(){
  if(window.history.replaceState){
    window.history.replaceState({},document.title,window.location.pathname);
  }
}

function isEmailConfirmationRedirect(){
  const hash=window.location.hash;
  const query=new URLSearchParams(window.location.search);
  return /type=(signup|email_confirmation)/i.test(hash)
    || ['signup','email_confirmation'].includes(query.get('type'))
    || hash.includes('access_token=');
}

/* NEW: Detect expired/invalid authentication errors */
function isAuthError(error){
  const message=String(error?.message||'').toLowerCase();
  const code=String(error?.code||'').toLowerCase();
  const status=Number(error?.status||error?.statusCode||0);

  return code.includes('jwt')
    || code.includes('token')
    || message.includes('jwt')
    || message.includes('token')
    || message.includes('session expired')
    || message.includes('invalid session')
    || message.includes('authentication')
    || status===401
    || status===403;
}

/* NEW: Clear expired session and return user to login */
async function handleSessionExpired(){
  if(authRedirecting)return;
  authRedirecting=true;

  user=null;
  budget=0;
  categories=[];
  expenses=[];

  try{
    if(db)await db.auth.signOut({scope:'local'});
  }catch(_){}

  $('#dashboard').hidden=true;
  $('#auth').hidden=false;

  $('#username').value='';
  $('#passcode').value='';
  $('#confirmPasscode').value='';

  setAuthMode(false);

  showError('Your session has expired. Please log in again.');

  window.setTimeout(()=>{
    authRedirecting=false;
  },500);
}

function applyTheme(theme){
  document.body.dataset.theme=theme;
  $('#themeBtn').textContent=theme==='dark'?'☀ Light':'☾ Dark';
  $('#themeBtn').setAttribute('aria-label',`Switch to ${theme==='dark'?'light':'dark'} mode`);
  localStorage.setItem('budget-vault-theme',theme);
}

function setAuthMode(reg){
  isRegister=reg;
  $('#confirmWrap').hidden=!reg;
  $('#confirmPasscode').required=reg;
  $('#authButton').textContent=reg?'Create account':'Log in';
  $('#authIntro').textContent=reg
    ?'Create a private space to manage your money from any device.'
    :'Welcome back. Log in to access your budget.';
  $('#passcode').autocomplete=reg?'new-password':'current-password';
  $('#switchAuth').textContent=reg?'Already have an account? Log in':'New here? Create an account';

  if(!$('#authHint').textContent.includes('session has expired')){
    $('#authHint').textContent=reg
      ?'Use an email address you can access, so you can confirm and recover your account.'
      :'Enter the email address and password you used to register.';
    $('#authHint').style.color='';
  }
}

async function initialise(){
  if(!configured()){
    return showError('Setup needed: add your Supabase URL and publishable key in config.js.');
  }

  db=window.supabase.createClient(config.supabaseUrl,config.supabaseAnonKey);

  /* NEW: Listen for Supabase session changes */
  db.auth.onAuthStateChange((event,session)=>{
    if(event==='SIGNED_OUT' || (event==='TOKEN_REFRESHED'&&!session)){
      handleSessionExpired();
    }
  });

  const confirmationRedirect=isEmailConfirmationRedirect();
  const {data:{session},error}=await db.auth.getSession();

  if(error){
    if(isAuthError(error))return handleSessionExpired();
    return showError(error.message);
  }

  if(session){
    await enterApp(session.user,confirmationRedirect);
    if(confirmationRedirect)clearAuthRedirect();
  }else if(confirmationRedirect){
    clearAuthRedirect();
    showError('Your email was confirmed. Please log in to continue.');
  }
}

async function register(email,password){
  const redirectUrl=new URL(window.location.href);
  redirectUrl.hash='';
  redirectUrl.search='';

  const {data,error}=await db.auth.signUp({
    email,
    password,
    options:{
      emailRedirectTo:redirectUrl.toString()
    }
  });

  if(error)throw error;

  if(!data.session){
    showError('Account created. Check your email to confirm it, then log in.');
    setAuthMode(false);
    return;
  }

  await enterApp(data.user,false);
}

async function login(email,password){
  const {data,error}=await db.auth.signInWithPassword({email,password});
  if(error)throw error;
  await enterApp(data.user,false);
}

async function enterApp(next,confirmed=false){
  authRedirecting=false;
  user=next;
  $('#auth').hidden=true;
  $('#dashboard').hidden=false;

  try{
    await loadData();
  }catch(error){
    if(isAuthError(error))return handleSessionExpired();
    throw error;
  }

  if(confirmed)showConfirmation();
}

async function loadData(){
  const [br,cr,er]=await Promise.all([
    db.from('budgets').select('amount').eq('user_id',user.id).maybeSingle(),
    db.from('categories').select('id,name').order('name'),
    db.from('expenses').select('id,description,amount,expense_date,notes,category_id,categories(name)').order('expense_date',{ascending:false})
  ]);

  const bad=[br,cr,er].find(x=>x.error);

  if(bad){
    /* NEW: Detect expired JWT instead of showing blank data */
    if(isAuthError(bad.error))return handleSessionExpired();

    return alert(`Could not load your data: ${bad.error.message}`);
  }

  budget=Number(br.data?.amount||0);
  categories=cr.data||[];

  if(!categories.length){
    const {data,error}=await db.from('categories').insert(
      defaults.map(name=>({user_id:user.id,name}))
    ).select('id,name');

    if(error){
      if(isAuthError(error))return handleSessionExpired();
      return alert(error.message);
    }

    categories=data;
  }

  expenses=(er.data||[]).map(x=>({
    ...x,
    date:x.expense_date,
    category:x.categories?.name||'Uncategorized'
  }));

  render();
}

function render(){
  const spent=expenses.reduce((a,x)=>a+Number(x.amount),0);
  const bal=budget-spent;

  $('#budgetTotal').textContent=fmt(budget);
  $('#totalSpent').textContent=fmt(spent);
  $('#balance').textContent=fmt(bal);
  $('#balance').style.color=bal<0?'#bf4d58':'';
  $('#expenseCount').textContent=`${expenses.length} transaction${expenses.length===1?'':'s'}`;
  $('#budgetState').textContent=budget
    ?(bal<0?'Over budget — review spending':'Remaining after expenses')
    :'Set a budget to begin';

  $('#monthLabel').textContent=new Intl.DateTimeFormat('en-IN',{
    month:'long',
    year:'numeric'
  }).format(new Date());

  $('#expenseCategory').innerHTML=categories
    .map(c=>`<option value="${c.id}">${esc(c.name)}</option>`)
    .join('');

  const old=$('#categoryFilter').value;

  $('#categoryFilter').innerHTML='<option value="">All categories</option>'+
    categories.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('');

  $('#categoryFilter').value=old;

  renderExpenses();
  renderBreakdown();
}

function renderExpenses(){
  const q=$('#searchInput').value.toLowerCase();
  const cat=$('#categoryFilter').value;

  const rows=expenses.filter(x=>
    (!cat||x.category_id===cat)&&
    (`${x.description} ${x.notes}`.toLowerCase().includes(q))
  );

  $('#expensesBody').innerHTML=rows.map(x=>
    `<tr>
      <td>${new Date(x.date+'T00:00:00').toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</td>
      <td><b>${esc(x.description)}</b>${x.notes?`<br><small class="muted">${esc(x.notes)}</small>`:''}</td>
      <td><span class="tag">${esc(x.category)}</span></td>
      <td class="amount">${fmt(x.amount)}</td>
      <td><div class="row-actions"><button onclick="editExpense('${x.id}')">Edit</button><button class="delete" onclick="removeExpense('${x.id}')">Delete</button></div></td>
    </tr>`
  ).join('');

  $('#emptyState').hidden=!!rows.length;
}

function renderBreakdown(){
  const sums={};
  expenses.forEach(x=>sums[x.category]=(sums[x.category]||0)+Number(x.amount));
  const max=Math.max(...Object.values(sums),1);

  $('#categoryBreakdown').innerHTML=Object.keys(sums).length
    ?Object.entries(sums).sort((a,b)=>b[1]-a[1]).map(([n,v])=>
      `<div class="breakdown-row"><span>${esc(n)}</span><b>${fmt(v)}</b><div class="bar"><i style="width:${v/max*100}%"></i></div></div>`
    ).join('')
    :'<p class="empty">Category totals will appear here.</p>';
}

function openExpense(x){
  $('#expenseTitle').textContent=x?'Edit expense':'Add expense';
  $('#expenseId').value=x?.id||'';
  $('#expenseDescription').value=x?.description||'';
  $('#expenseAmount').value=x?.amount||'';
  $('#expenseDate').value=x?.date||new Date().toISOString().slice(0,10);
  $('#expenseCategory').value=x?.category_id||categories[0]?.id;
  $('#expenseNotes').value=x?.notes||'';
  $('#expenseDialog').showModal();
}

window.editExpense=id=>openExpense(expenses.find(x=>x.id===id));

window.removeExpense=async id=>{
  if(!confirm('Delete this expense?'))return;

  const {error}=await db.from('expenses').delete().eq('id',id);

  if(error){
    if(isAuthError(error))return handleSessionExpired();
    return alert(error.message);
  }

  await loadData();
};

function renderCategories(){
  $('#categoryList').innerHTML=categories.map(c=>
    `<div><span>${esc(c.name)}</span><button type="button" onclick="removeCategory('${c.id}')">Remove</button></div>`
  ).join('');
}

window.removeCategory=async id=>{
  if(expenses.some(x=>x.category_id===id)){
    return alert('Move or delete expenses in this category first.');
  }

  const {error}=await db.from('categories').delete().eq('id',id);

  if(error){
    if(isAuthError(error))return handleSessionExpired();
    return alert(error.message);
  }

  await loadData();
  renderCategories();
};

$('#authForm').onsubmit=async e=>{
  e.preventDefault();

  if(!configured())return;

  const email=$('#username').value.trim();
  const pass=$('#passcode').value;

  if(isRegister){
    const confirm=$('#confirmPasscode').value;
    if(pass!==confirm)return showError('Passwords do not match.');
  }

  try{
    if(isRegister)await register(email,pass);
    else await login(email,pass);
  }catch(e){
    if(isAuthError(e))return handleSessionExpired();
    showError(e.message);
  }
};

$('#switchAuth').onclick=()=>setAuthMode(!isRegister);

$('#addExpenseBtn').onclick=()=>openExpense();

$('#editBudgetBtn').onclick=()=>{
  $('#budgetInput').value=budget||'';
  $('#budgetDialog').showModal();
};

$('#addCategoryBtn').onclick=()=>{
  renderCategories();
  $('#categoryDialog').showModal();
};

document.querySelectorAll('[data-close]').forEach(x=>
  x.onclick=()=>$('#'+x.dataset.close).close()
);

$('#budgetForm').onsubmit=async e=>{
  e.preventDefault();

  const {error}=await db.from('budgets').upsert({
    user_id:user.id,
    amount:Number($('#budgetInput').value),
    updated_at:new Date().toISOString()
  });

  if(error){
    if(isAuthError(error))return handleSessionExpired();
    return alert(error.message);
  }

  $('#budgetDialog').close();
  await loadData();
};

$('#expenseForm').onsubmit=async e=>{
  e.preventDefault();

  const id=$('#expenseId').value;

  const record={
    user_id:user.id,
    description:$('#expenseDescription').value.trim(),
    amount:Number($('#expenseAmount').value),
    expense_date:$('#expenseDate').value,
    category_id:$('#expenseCategory').value,
    notes:$('#expenseNotes').value.trim()
  };

  const res=id
    ?await db.from('expenses').update(record).eq('id',id)
    :await db.from('expenses').insert(record);

  if(res.error){
    if(isAuthError(res.error))return handleSessionExpired();
    return alert(res.error.message);
  }

  $('#expenseDialog').close();
  await loadData();
};

$('#createCategoryBtn').onclick=async()=>{
  const name=$('#newCategory').value.trim();

  if(!name)return;

  if(categories.some(c=>c.name.toLowerCase()===name.toLowerCase())){
    return alert('That category already exists.');
  }

  const {error}=await db.from('categories').insert({
    user_id:user.id,
    name
  });

  if(error){
    if(isAuthError(error))return handleSessionExpired();
    return alert(error.message);
  }

  $('#newCategory').value='';
  await loadData();
  renderCategories();
};

$('#searchInput').oninput=renderExpenses;
$('#categoryFilter').onchange=renderExpenses;

$('#lockBtn').onclick=async()=>{
  await db.auth.signOut({scope:'local'});

  user=null;

  $('#dashboard').hidden=true;
  $('#auth').hidden=false;

  $('#username').value=$('#passcode').value=$('#confirmPasscode').value='';

  setAuthMode(false);
};

$('#themeBtn').onclick=()=>applyTheme(
  document.body.dataset.theme==='dark'?'light':'dark'
);

$('#csvBtn').onclick=()=>{
  const rows=[
    ['Date','Description','Category','Amount','Notes'],
    ...expenses.map(x=>[x.date,x.description,x.category,x.amount,x.notes])
  ];

  const csv=rows
    .map(r=>r.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(','))
    .join('\n');

  const a=document.createElement('a');

  a.href=URL.createObjectURL(
    new Blob([csv],{type:'text/csv'})
  );

  a.download='budget-expenses.csv';
  a.click();

  URL.revokeObjectURL(a.href);
};

$('#pdfBtn').onclick=()=>window.print();

applyTheme(localStorage.getItem('budget-vault-theme')||'light');
setAuthMode(false);
initialise();