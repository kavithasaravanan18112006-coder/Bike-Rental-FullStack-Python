const app = document.getElementById("app");
const API_BASE = (window.location.protocol === "file:" || (window.location.port && window.location.port !== "8000")) ? "http://127.0.0.1:8000/api" : "/api";
async function api(path, options={}){
  const headers={"Content-Type":"application/json",...(options.headers||{})};
  const token=localStorage.getItem("bikeToken");
  if(token) headers.Authorization="Bearer "+token;
  const res=await fetch(API_BASE+path,{...options,headers});
  let data={}; try{data=await res.json()}catch(e){}
  if(!res.ok){ if(res.status===401){ localStorage.removeItem("bikeToken"); localStorage.removeItem("bikeLoggedIn"); } throw new Error((typeof data.detail === "string" ? data.detail : "Request failed")+` (HTTP ${res.status})`); }
  return data;
}
async function syncBackend(){
  if(!localStorage.getItem("bikeToken")) return;
  try{
    const [me,bs,bookingsApi,notificationsApi]=await Promise.all([api("/me"),api("/bikes"),api("/bookings"),api("/notifications")]);
    localStorage.setItem("bikeUser",me.name); localStorage.setItem("bikeEmail",me.email);
    bikes=Array.isArray(bs) ? bs.map(b=>({...b,id:Number(b.id),status:String(b.status||"").trim()})) : [];
    bookings=Array.isArray(bookingsApi) ? bookingsApi : [];
    backendNotifications=Array.isArray(notificationsApi) ? notificationsApi : [];
    if(me.role==="Admin"||me.role==="Administrator") users=await api("/users");
  }catch(e){ console.warn("Backend sync:",e.message); if(String(e.message).includes("HTTP 401")){ localStorage.removeItem("bikeToken"); localStorage.removeItem("bikeLoggedIn"); }}
}

const toast = document.getElementById("toast");

let bikes = [
  {id:"BR-001",number:"HR26 AB 1234",type:"Electric Bike",location:"Anna Nagar",battery:75,status:"Available",price:180},
  {id:"BR-002",number:"TN09 CD 5678",type:"City Bike",location:"T. Nagar",battery:60,status:"Available",price:150},
  {id:"BR-003",number:"KA05 EF 9012",type:"Electric Bike",location:"Nungambakkam",battery:80,status:"On Ride",price:220},
  {id:"BR-004",number:"MH12 GH 3456",type:"Mountain Bike",location:"Velachery",battery:55,status:"Available",price:200},
  {id:"BR-005",number:"TN07 IJ 7890",type:"City Bike",location:"Adyar",battery:90,status:"Maintenance",price:160},
  {id:"BR-006",number:"TN10 KL 2468",type:"Electric Bike",location:"Anna Nagar",battery:88,status:"Available",price:220}
];

let bookings = JSON.parse(localStorage.getItem("bikeBookings") || "[]");
let backendNotifications = [];
let users = JSON.parse(localStorage.getItem("bikeUsers") || JSON.stringify([
  {name:"Rahul Kumar",email:"rahul@example.com",role:"Customer",status:"Active"},
  {name:"Priya Singh",email:"priya@example.com",role:"Customer",status:"Active"},
  {name:"Neha Patel",email:"neha@example.com",role:"Owner",status:"Active"},
  {name:"Arun Raj",email:"arun@example.com",role:"Customer",status:"Blocked"}
]));

function save(){
  localStorage.setItem("bikeBookings", JSON.stringify(bookings));
  localStorage.setItem("bikeUsers", JSON.stringify(users));
}
function showToast(msg){
  toast.textContent=msg; toast.style.display="block";
  clearTimeout(window.toastTimer);
  window.toastTimer=setTimeout(()=>toast.style.display="none",2300);
}
function isLogged(){return localStorage.getItem("bikeLoggedIn")==="true";}
function currentUser(){return localStorage.getItem("bikeUser") || "Kavitha S";}
function go(page){location.hash=page;}
function nav(active){
  const items=[
    ["dashboard","▦ Dashboard"],["analytics","📈 Analytics"],["bikes","🚲 Bikes"],["booking","▣ Bookings"],
    ["tracking","📍 Live Tracking"],["users","♙ Users"],["payment","▤ Payments"],
    ["maintenance","🔧 Maintenance"],["reviews","⭐ Reviews"],["notifications","🔔 Notifications"],["settings","⚙ Settings"],["profile","◉ Profile"]
  ];
  return items.map(([key,label])=>`<button class="${active===key?'active':''}" onclick="go('${key}')">${label}</button>`).join("");
}
function shell(active,title,subtitle,content){
  const initials=currentUser().split(" ").map(x=>x[0]).join("").slice(0,2).toUpperCase();
  return `<div class="app-shell">
    <aside class="sidebar" id="sidebar">
      <div class="side-brand"><span class="brand-icon">🚲</span><div><strong>BikeRental</strong><small>Admin Panel</small></div></div>
      <nav class="nav">${nav(active)}</nav>
      <button class="logout-btn" onclick="logout()">↪ Logout</button>
    </aside>
    <main class="main">
      <header class="topbar">
        <div style="display:flex;align-items:center;gap:12px">
          <button class="menu-mobile" onclick="toggleSide()">☰</button>
          <div class="page-title"><h1>${title}</h1><p>${subtitle}</p></div>
        </div>
        <div class="top-right">
          <button class="action-btn notification-trigger" onclick="go('notifications')" title="Notifications">🔔 <span id="notificationCount">6</span></button>
          <div class="avatar">${initials}</div><div class="user-mini"><b>${currentUser()}</b><small>Admin</small></div>
        </div>
      </header>
      <div class="content">${content}</div>
    </main>
  </div>`;
}

function landing(){
  return `<div class="landing">
    <nav class="landing-nav"><div class="brand"><span class="brand-icon">🚲</span> BikeRental</div>
      <div class="nav-actions"><button class="btn btn-outline" onclick="go('login')">Login</button><button class="btn btn-primary" onclick="go('register')">Register</button></div>
    </nav>
    <section class="hero">
      <div><h1>Ride smarter.<br><span>Explore freely.</span></h1><p>Book bikes easily, track active rides, manage payments and monitor your complete bike rental operation from one smart platform.</p>
        <div class="hero-actions"><button class="btn btn-primary" onclick="go('register')">Get Started →</button><button class="btn btn-outline" onclick="go('login')">Login</button></div>
      </div>
      <div class="hero-card"><div class="hero-map"><button class="hero-bike hb1">🚲</button><button class="hero-bike hb2">🚲</button><button class="hero-bike hb3">🚲</button></div></div>
    </section>
    <section class="features"><h2>Everything you need in one platform</h2><div class="feature-grid">
      <div class="feature"><div class="feature-icon">📍</div><h3>Live Tracking</h3><p>Monitor active bikes and rides with live location information.</p></div>
      <div class="feature"><div class="feature-icon">📅</div><h3>Easy Booking</h3><p>Choose a bike, select your ride time and confirm your booking.</p></div>
      <div class="feature"><div class="feature-icon">💳</div><h3>Secure Payments</h3><p>View payment details and complete checkout through the dashboard.</p></div>
    </div></section>
  </div>`;
}

function auth(type){
  const isRegister=type==="register";
  const isForgot=type==="forgot";
  let body="";
  if(isForgot){
    body=`<div id="authMsg"></div><div class="form-group"><label>Email Address</label><input id="forgotEmail" type="email" placeholder="Enter your email"></div><button class="btn btn-primary" onclick="resetPassword()">Send Reset Link</button><div class="auth-link">Remembered your password? <a onclick="go('login')">Login</a></div>`;
  }else if(isRegister){
    body=`<div id="authMsg"></div><div class="form-group"><label>Full Name</label><input id="regName" placeholder="Enter your name"></div><div class="form-group"><label>Email</label><input id="regEmail" type="email" placeholder="Enter your email"></div><div class="form-group"><label>Password</label><input id="regPass" type="password" placeholder="Create password"></div><div class="form-group"><label>Role</label><select id="regRole"><option>Customer</option><option>Bike Owner</option></select></div><button class="btn btn-primary" onclick="register()">Create Account</button><div class="auth-link">Already have an account? <a onclick="go('login')">Login</a></div>`;
  }else{
    body=`<div id="authMsg"></div><div class="form-group"><label>Email</label><input id="loginEmail" type="email" placeholder="admin@example.com"></div><div class="form-group"><label>Password</label><input id="loginPass" type="password" placeholder="Enter password"></div><div style="text-align:right;font-size:11px;margin-bottom:12px"><a style="color:var(--primary);cursor:pointer" onclick="go('forgot')">Forgot Password?</a></div><button class="btn btn-primary" onclick="login()">Login</button><div class="auth-link">Don't have an account? <a onclick="go('register')">Register</a></div>`;
  }
  return `<div class="auth-page"><div class="auth-card"><div class="brand" style="justify-content:center;color:var(--dark);margin-bottom:20px"><span class="brand-icon">🚲</span> BikeRental</div><h1>${isRegister?"Create Account":isForgot?"Reset Password":"Welcome Back"}</h1><p class="auth-sub">${isRegister?"Register to start using BikeRental":isForgot?"Enter your email to receive a reset link":"Login to your BikeRental admin dashboard"}</p>${body}</div></div>`;
}

function dashboard(){
  return shell("dashboard","Dashboard","Overview of your bike rental platform",`
    <section class="stats">
      ${stat("🚲","Total Bikes","250","All Bikes","greenbg")}${stat("▶","Active Rentals","45","Live Now","bluebg")}${stat("📅","Bookings","128","This Month","purplebg")}${stat("💳","Revenue","₹84,520","This Month","orangebg")}${stat("⚑","Alerts","3","Need Attention","redbg")}
    </section>
    <section class="grid2">
      <div class="card"><div class="card-title"><h3>Recent Bookings</h3><a onclick="go('booking')">View All</a></div>
        <div class="table-wrap"><table class="table"><thead><tr><th>Booking</th><th>Customer</th><th>Bike</th><th>Status</th><th>Amount</th></tr></thead><tbody>
          <tr><td>#BK1001</td><td>Rahul Kumar</td><td>HR26 AB 1234</td><td><span class="status active">Confirmed</span></td><td>₹360</td></tr>
          <tr><td>#BK1002</td><td>Priya Singh</td><td>TN09 CD 5678</td><td><span class="status pending">Pending</span></td><td>₹300</td></tr>
          <tr><td>#BK1003</td><td>Arun Raj</td><td>KA05 EF 9012</td><td><span class="status active">Completed</span></td><td>₹440</td></tr>
        </tbody></table></div>
      </div>
      <div class="card"><div class="card-title"><h3>Quick Actions</h3></div>
        <div class="grid3" style="grid-template-columns:1fr 1fr"><button class="btn btn-primary" onclick="go('bikes')">🚲 Bikes</button><button class="btn btn-primary" onclick="go('booking')">📅 Booking</button><button class="btn btn-primary" onclick="go('tracking')">📍 Tracking</button><button class="btn btn-primary" onclick="go('users')">♙ Users</button></div>
      </div>
    </section>
    <section class="grid2" style="margin-top:18px"><div class="card"><div class="card-title"><h3>Revenue Overview</h3></div><div style="height:180px;display:flex;align-items:end;gap:12px;padding:20px"><div class="bar" style="height:35%"></div><div class="bar" style="height:50%"></div><div class="bar" style="height:42%"></div><div class="bar" style="height:70%"></div><div class="bar" style="height:62%"></div><div class="bar" style="height:85%"></div><div class="bar" style="height:75%"></div></div></div><div class="card"><div class="card-title"><h3>System Status</h3></div><div class="toggle-row"><span>GPS Tracking</span><span class="status active">Online</span></div><div class="toggle-row"><span>Payment Gateway</span><span class="status active">Online</span></div><div class="toggle-row"><span>Bike Network</span><span class="status active">Healthy</span></div></div></section>`);
}
function stat(icon,label,value,sub,cls){return `<div class="card stat"><div class="stat-icon ${cls}">${icon}</div><div><small>${label}</small><strong>${value}</strong><span>${sub}</span></div></div>`}

function bikesPage(){
  const cards=bikes.map(b=>`<div class="bike-card"><div class="bike-img">🚲</div><h3>${b.number}</h3><div class="bike-meta"><span>${b.type}</span><span>₹${b.price}/hr</span></div><div class="bike-meta"><span>📍 ${b.location}</span><span>🔋 ${b.battery}%</span></div><span class="status ${b.status==="Available"?"active":b.status==="Maintenance"?"blocked":"pending"}">${b.status}</span><button class="btn btn-primary" onclick="selectBike('${b.id}')">Book This Bike</button></div>`).join("");
  return shell("bikes","Bike Management","View and manage all bikes",`<div class="page-head"><div><h2>All Bikes</h2><p>Manage availability and rental bikes.</p></div><button class="btn btn-primary" onclick="showToast('Add Bike form can be connected to backend')">+ Add Bike</button></div><div class="searchbar"><input id="bikeSearch" placeholder="Search bikes..." oninput="filterBikes()"><select onchange="filterBikeStatus(this.value)"><option value="all">All Status</option><option>Available</option><option>On Ride</option><option>Maintenance</option></select></div><div class="bike-grid" id="bikeGrid">${cards}</div>`);
}
function filterBikes(){const q=document.getElementById("bikeSearch").value.toLowerCase();document.querySelectorAll(".bike-card").forEach(c=>c.style.display=c.innerText.toLowerCase().includes(q)?"":"none")}
function filterBikeStatus(s){document.querySelectorAll(".bike-card").forEach(c=>c.style.display=s==="all"||c.innerText.includes(s)?"":"none")}

function bookingPage(){
  return shell("booking","Booking Management","Create and manage bike bookings",`<div class="booking-layout">
    <div class="form-card"><div class="page-head"><div><h2>New Booking</h2><p>Select a bike and ride details.</p></div></div>
      <div class="form-group"><label>Customer Name</label><input id="bookName" value="${currentUser()}"></div>
      <div class="form-group"><label>Select Bike</label><select id="bookBike">${bikes.filter(b=>String(b.status).toLowerCase()==="available").map(b=>`<option value="${b.id}">${b.number} - ₹${b.price}/hr</option>`).join("") || '<option value="">No available bikes</option>'}</select></div>
      <div class="two-input"><div class="form-group"><label>Start Date</label><input id="bookDate" type="date"></div><div class="form-group"><label>Hours</label><input id="bookHours" type="number" min="1" value="2"></div></div>
      <div class="form-group"><label>Pickup Location</label><select id="bookLocation"><option>Anna Nagar</option><option>T. Nagar</option><option>Adyar</option><option>Velachery</option></select></div>
      <button class="btn btn-primary" style="width:100%" onclick="createBooking()">Confirm Booking</button>
    </div>
    <div class="booking-summary"><h2>Booking Summary</h2><div class="summary-row"><span>Bike</span><b id="summaryBike">Select a bike</b></div><div class="summary-row"><span>Duration</span><b id="summaryHours">2 hours</b></div><div class="summary-row"><span>Rate</span><b id="summaryRate">₹0/hr</b></div><div class="summary-row"><span>Total</span><b id="summaryTotal">₹0</b></div><p style="margin-top:25px;color:#a8bdc8;font-size:11px;line-height:1.6">After confirming, you can proceed to the Payment page to simulate payment.</p></div>
  </div><div class="card" style="margin-top:18px"><div class="card-title"><h3>Recent Bookings</h3></div>${bookings.length?`<table class="table"><thead><tr><th>ID</th><th>Customer</th><th>Bike</th><th>Date</th><th>Total</th><th>Status</th></tr></thead><tbody>${bookings.slice(-6).reverse().map(b=>`<tr><td>${b.id}</td><td>${b.customer}</td><td>${b.bike}</td><td>${b.date}</td><td>₹${b.total}</td><td><span class="status active">${b.status}</span></td></tr>`).join("")}</tbody></table>`:`<div class="empty">No bookings yet.</div>`}</div>`);
}
function selectBike(id){localStorage.setItem("selectedBike",id);go("booking")}
function updateSummary(){const id=document.getElementById("bookBike")?.value;const h=Number(document.getElementById("bookHours")?.value||2);const b=bikes.find(x=>String(x.id)===String(id));if(!b){const sb=document.getElementById("summaryBike");if(sb)sb.textContent="No bike selected";return;}document.getElementById("summaryBike").textContent=b.number;document.getElementById("summaryHours").textContent=h+" hours";document.getElementById("summaryRate").textContent="₹"+b.price+"/hr";document.getElementById("summaryTotal").textContent="₹"+(b.price*h)}
async function createBooking(){
  const bike=bikes.find(b=>String(b.id)===String(document.getElementById("bookBike").value));
  const date=document.getElementById("bookDate").value; const hours=Number(document.getElementById("bookHours").value); const pickup=document.getElementById("bookLocation").value;
  if(!bike||!date||hours<1){showToast("Please fill all booking details");return}
  try{
    const booking=await api("/bookings",{method:"POST",body:JSON.stringify({bike_id:Number(bike.id),start_date:date,hours,pickup_location:pickup})});
    bookings=[booking,...bookings]; localStorage.setItem("lastPayment",JSON.stringify(booking));
    showToast("Booking confirmed!"); setTimeout(()=>go("payment"),500);
  }catch(e){showToast(e.message)}
}
function trackBike(bike){showModal(bike,"<div class='modal-row'><b>Status</b><span class='status active'>● On Ride</span></div><div class='modal-row'><b>Location</b><span>Chennai</span></div><div class='modal-row'><b>Speed</b><span>"+(20+Math.floor(Math.random()*18))+" km/h</span></div><div class='modal-row'><b>GPS</b><span>Connected</span></div>")}


function trackingPage(){
  const active=bikes.filter(b=>b.status==='On Ride');
  const rows=active.length?active.map(b=>`<tr><td>${b.number}</td><td>📍 ${b.location}</td><td>${b.battery}%</td><td>25 km/h</td><td><span class="status active">On Ride</span></td><td><button class="action-btn" onclick='trackBike(${JSON.stringify(b)})'>View</button></td></tr>`).join(''):`<tr><td colspan="6"><div class="empty">No active rides right now.</div></td></tr>`;
  return shell('tracking','Live Tracking','Monitor active bikes and ride status',`<div class="page-head"><div><h2>Live Bike Tracking</h2><p>Current fleet location and ride information.</p></div><button class="btn btn-primary" onclick="loadTracking()">↻ Refresh</button></div><div class="stats"><div class="card stat"><div class="stat-icon bluebg">📍</div><div><small>Active Rides</small><strong>${active.length}</strong><span>Currently on ride</span></div></div><div class="card stat"><div class="stat-icon greenbg">🛰</div><div><small>GPS Network</small><strong>Online</strong><span>Connected</span></div></div></div><div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Bike</th><th>Location</th><th>Battery</th><th>Speed</th><th>Status</th><th>Action</th></tr></thead><tbody>${rows}</tbody></table></div></div>`);
}
async function loadTracking(){ try { const data=await api('/tracking'); if(Array.isArray(data)) showToast(`Tracking refreshed: ${data.length} active ride(s)`); } catch(e){showToast(e.message)} }

function paymentPage(){
  const last=JSON.parse(localStorage.getItem('lastPayment')||'null');
  return shell('payment','Payment Management','Review and record booking payments',`<div class="booking-layout"><div class="form-card"><h2>Payment</h2><p class="auth-sub">Demo payment recording — no real money is charged.</p><div class="form-group"><label>Booking</label><input id="payBooking" value="${last?.id||''}" readonly></div><div class="form-group"><label>Payment Method</label><div style="display:flex;gap:10px;flex-wrap:wrap"><button type="button" class="payment-method selected" onclick="selectPay(this)">Demo Card</button><button type="button" class="payment-method" onclick="selectPay(this)">UPI Demo</button><button type="button" class="payment-method" onclick="selectPay(this)">Cash</button></div></div><div class="form-group"><label>Reference</label><input id="payRef" placeholder="PAY-DEMO-001"></div><button class="btn btn-primary" style="width:100%" onclick="payNow()">Complete Payment</button></div><div class="booking-summary"><h2>Summary</h2><div class="summary-row"><span>Booking</span><b>${last?.id||'No booking'}</b></div><div class="summary-row"><span>Bike</span><b>${last?.bike||'-'}</b></div><div class="summary-row"><span>Total</span><b>₹${last?.total||0}</b></div></div></div>`);
}

function maintenancePage(){
  return shell('maintenance','Maintenance','Track bike maintenance and service issues',`<div class="page-head"><div><h2>Maintenance Records</h2><p>Monitor reported issues and maintenance status.</p></div><button class="btn btn-primary" onclick="showMaintenanceForm()">+ Report Issue</button></div><div class="card"><div class="table-wrap"><table class="table"><thead><tr><th>Bike</th><th>Issue</th><th>Priority</th><th>Status</th><th>Reported</th></tr></thead><tbody id="maintenanceBody"><tr><td colspan="5">Loading...</td></tr></tbody></table></div></div>`);
}
async function loadMaintenance(){try{const rows=await api('/maintenance');const body=document.getElementById('maintenanceBody');if(body)body.innerHTML=rows.length?rows.map(m=>`<tr><td>${m.bike}</td><td>${m.issue}</td><td><span class="status ${m.priority==='High'?'blocked':'pending'}">${m.priority}</span></td><td><span class="status ${m.status==='Open'?'active':'pending'}">${m.status}</span></td><td>${m.reported_on}</td></tr>`).join(''):`<tr><td colspan="5"><div class="empty">No maintenance records.</div></td></tr>`;}catch(e){showToast(e.message)}}
function showMaintenanceForm(){showModal('Report Maintenance Issue',`<div class="form-group"><label>Bike</label><select id="maintBike">${bikes.map(b=>`<option value="${b.id}">${b.number}</option>`).join('')}</select></div><div class="form-group"><label>Issue</label><input id="maintIssue" placeholder="e.g. Brake inspection"></div><div class="form-group"><label>Priority</label><select id="maintPriority"><option>Low</option><option selected>Medium</option><option>High</option></select></div><button class="btn btn-primary" style="width:100%" onclick="submitMaintenance()">Create Report</button>`)}
async function submitMaintenance(){const bike_id=Number(document.getElementById('maintBike').value),issue=document.getElementById('maintIssue').value.trim(),priority=document.getElementById('maintPriority').value;if(!issue){showToast('Enter an issue');return}try{await api('/maintenance',{method:'POST',body:JSON.stringify({bike_id,issue,priority})});closeModal();await render();showToast('Maintenance issue created')}catch(e){showToast(e.message)}}

function reviewsPage(){
  return shell('reviews','Reviews & Ratings','Customer feedback for your bikes',`<div class="page-head"><div><h2>Reviews & Ratings</h2><p>Monitor customer comments and ratings.</p></div><button class="btn btn-primary" onclick="showReviewForm()">+ Add Review</button></div><div class="card"><div id="reviewsList">Loading...</div></div>`);
}
async function loadReviews(){try{const rows=await api('/reviews');const el=document.getElementById('reviewsList');if(el)el.innerHTML=rows.length?rows.map(r=>`<div class="notification-item"><div class="alert-icon greenbg">⭐</div><div><b>${r.bike} — ${r.rating}/5</b><p>${r.comment}</p><small>${new Date(r.created_at).toLocaleString()}</small></div></div>`).join(''):`<div class="empty">No reviews yet.</div>`}catch(e){showToast(e.message)}}
function showReviewForm(){showModal('Add Review',`<div class="form-group"><label>Bike</label><select id="reviewBike">${bikes.map(b=>`<option value="${b.id}">${b.number}</option>`).join('')}</select></div><div class="form-group"><label>Rating</label><select id="reviewRating"><option>5</option><option>4</option><option>3</option><option>2</option><option>1</option></select></div><div class="form-group"><label>Comment</label><textarea id="reviewComment" rows="4" placeholder="Write your review"></textarea></div><button class="btn btn-primary" style="width:100%" onclick="submitReview()">Submit Review</button>`)}
async function submitReview(){const bike_id=Number(document.getElementById('reviewBike').value),rating=Number(document.getElementById('reviewRating').value),comment=document.getElementById('reviewComment').value.trim();if(!comment){showToast('Enter a comment');return}try{await api('/reviews',{method:'POST',body:JSON.stringify({bike_id,rating,comment})});closeModal();await render();showToast('Review submitted')}catch(e){showToast(e.message)}}

function settingsPage(){
  return shell('settings','Settings','Configure platform preferences',`<div class="card"><h2>Platform Settings</h2><div class="form-group"><label>Platform Name</label><input id="platformName" value="BikeRental"></div><div class="form-group"><label>Default Location</label><input value="Chennai, Tamil Nadu" readonly></div><div class="toggle-row"><span>Email Notifications</span><span class="status active">Enabled</span></div><div class="toggle-row"><span>GPS Tracking</span><span class="status active">Enabled</span></div><button class="btn btn-primary" style="margin-top:20px" onclick="saveSettings()">Save Settings</button></div>`);
}

function usersPage(){
  return shell("users","User Management","Manage customers, bike owners and admin users",`<div class="page-head"><div><h2>Users</h2><p>View, edit and manage registered users.</p></div><button class="btn btn-primary" onclick="addDemoUser()">+ Add User</button></div><div class="card"><div class="searchbar"><input placeholder="Search users..." oninput="filterUsers(this.value)"><select onchange="filterUsers(this.value)"><option value="">All</option><option>Customer</option><option>Owner</option><option>Active</option><option>Blocked</option></select></div><div class="table-wrap"><table class="table"><thead><tr><th>User</th><th>Email</th><th>Role</th><th>Status</th><th>Action</th></tr></thead><tbody id="usersBody">${userRows()}</tbody></table></div></div>`);
}
function userRows(){return users.map((u,i)=>`<tr><td>${u.name}</td><td>${u.email}</td><td>${u.role}</td><td><span class="status ${u.status.toLowerCase()}">${u.status}</span></td><td><button class="action-btn" onclick="showModal('${u.name}','<div class=modal-row><b>Email</b><span>${u.email}</span></div><div class=modal-row><b>Role</b><span>${u.role}</span></div><div class=modal-row><b>Status</b><span>${u.status}</span></div>')">View</button><button class="action-btn danger" onclick="deleteUser(${i})">Delete</button></td></tr>`).join("")}
async function addDemoUser(){
  try{await api("/users",{method:"POST",body:JSON.stringify({name:"New User",email:"newuser"+Date.now()+"@example.com",role:"Customer",status:"Active"})}); users=await api("/users"); go("users"); showToast("User added")
  }catch(e){showToast(e.message)}
}
function selectPay(el){document.querySelectorAll(".payment-method").forEach(x=>x.classList.remove("selected"));el.classList.add("selected")}
async function payNow(){
  const ref=document.getElementById("payRef").value.trim(); if(!ref){showToast("Enter a demo payment reference");return}
  const last=JSON.parse(localStorage.getItem("lastPayment")||"null"); if(!last){showToast("No booking selected");return}
  try{
    await api("/payments",{method:"POST",body:JSON.stringify({booking_id:String(last.id),reference:ref,method:"Demo"})});
    localStorage.setItem("paymentStatus","Paid");
    showModal("Payment Successful","<div style='text-align:center;padding:15px'><div style='font-size:45px'>✅</div><h3 style='margin:10px'>Payment Completed</h3><p style='color:#7d8994;font-size:12px'>Your payment was recorded in the backend database.</p><button class='btn btn-primary' style='margin-top:18px;width:100%' onclick='document.getElementById(\"globalModal\").remove();go(\"dashboard\")'>Go to Dashboard</button></div>");
  }catch(e){showToast(e.message)}
}
async function saveSettings(){
  try{await api("/settings",{method:"PUT",body:JSON.stringify({platform_name:document.getElementById("platformName").value,default_location:"Chennai, Tamil Nadu",email_notifications:true,gps_tracking:true})});showToast("Settings saved successfully")}catch(e){showToast(e.message)}
}

async function deleteUser(i){
  if(!confirm("Delete this user?")) return;
  try{
    await api("/users/"+users[i].id,{method:"DELETE"});
    users=await api("/users");
    go("users"); showToast("User deleted");
  }catch(e){showToast(e.message)}
}

async function saveProfile(){
  const name=document.getElementById("profileName").value.trim();
  if(!name)return;
  try{
    await api("/profile",{method:"PUT",body:JSON.stringify({name})});
    localStorage.setItem("bikeUser",name);
    showToast("Profile updated successfully"); go("profile");
  }catch(e){showToast(e.message)}
}

function profilePage(){
  return shell("profile","Profile","Manage your administrator profile",`<div class="card profile-card"><div><div class="profile-avatar">${currentUser().split(" ").map(x=>x[0]).join("").slice(0,2).toUpperCase()}</div><button class="btn btn-primary" style="width:130px;margin-top:12px" onclick="showToast('Profile photo upload selected')">Change Photo</button></div><div><h2 style="margin-bottom:20px">${currentUser()}</h2><div class="two-input"><div class="form-group"><label>Full Name</label><input id="profileName" value="${currentUser()}"></div><div class="form-group"><label>Role</label><input value="Administrator" readonly></div></div><div class="form-group"><label>Email</label><input value="${localStorage.getItem("bikeEmail")||"admin@bikerental.com"}"></div><button class="btn btn-primary" onclick="saveProfile()">Save Profile</button></div></div>`);
}

function logout(){localStorage.removeItem("bikeLoggedIn");localStorage.removeItem("bikeToken");localStorage.removeItem("bikeEmail");go("landing");showToast("Logged out successfully")}
function toggleSide(){document.getElementById("sidebar").classList.toggle("open")}

function showModal(title,content){const old=document.getElementById("globalModal");if(old)old.remove();const div=document.createElement("div");div.id="globalModal";div.className="modal";div.innerHTML=`<div class="modal-box"><button class="close" onclick="document.getElementById('globalModal').remove()">×</button><h2 style="margin-bottom:18px">${title}</h2>${content}</div>`;document.body.appendChild(div)}
window.showModal=showModal;
function closeModal(){const m=document.getElementById("globalModal");if(m)m.remove();}
window.closeModal=closeModal;
function selectInitialBooking(){const id=localStorage.getItem("selectedBike");const select=document.getElementById("bookBike");if(select&&id&&[...select.options].some(o=>o.value===id)){select.value=id;localStorage.removeItem("selectedBike")}updateSummary();if(select)select.onchange=updateSummary;const h=document.getElementById("bookHours");if(h)h.oninput=updateSummary}

async function login(){
  const email=document.getElementById("loginEmail").value.trim();
  const pass=document.getElementById("loginPass").value;
  const msg=document.getElementById("authMsg");
  if(!email||!pass){msg.innerHTML='<div class="error">Please enter email and password.</div>';return}
  try{
    const data=await api("/auth/login",{method:"POST",body:JSON.stringify({email,password:pass})});
    localStorage.setItem("bikeToken",data.access_token); localStorage.setItem("bikeLoggedIn","true"); localStorage.setItem("bikeUser",data.user.name); localStorage.setItem("bikeEmail",data.user.email);
    await syncBackend(); go("dashboard");
  }catch(e){msg.innerHTML='<div class="error">'+e.message+'</div>'}
}
async function register(){
  const name=document.getElementById("regName").value.trim(),email=document.getElementById("regEmail").value.trim(),pass=document.getElementById("regPass").value,role=document.getElementById("regRole").value,msg=document.getElementById("authMsg");
  if(!name||!email||pass.length<4){msg.innerHTML='<div class="error">Enter all details. Password must contain at least 4 characters.</div>';return}
  try{
    const data=await api("/auth/register",{method:"POST",body:JSON.stringify({name,email,password:pass,role})});
    localStorage.setItem("bikeToken",data.access_token);localStorage.setItem("bikeLoggedIn","true");localStorage.setItem("bikeUser",name);localStorage.setItem("bikeEmail",email);
    await syncBackend(); go("dashboard");
  }catch(e){msg.innerHTML='<div class="error">'+e.message+'</div>'}
}
function resetPassword(){
  const email=document.getElementById("forgotEmail").value.trim(),msg=document.getElementById("authMsg");
  if(!email){msg.innerHTML='<div class="error">Please enter your email.</div>';return}
  msg.innerHTML='<div class="success">Demo reset link sent to '+email+'.</div>';
}


function analyticsPage(){
  const revenue=[42000,51000,47000,62000,58500,73500,84520];
  const labels=["Jan","Feb","Mar","Apr","May","Jun","Jul"];
  const max=Math.max(...revenue);
  const bars=revenue.map((v,i)=>`
    <div class="analytics-bar-wrap">
      <div class="analytics-value">₹${Math.round(v/1000)}k</div>
      <div class="analytics-bar" style="height:${Math.max(24,Math.round(v/max*150))}px"></div>
      <small>${labels[i]}</small>
    </div>`).join("");

  return shell("analytics","Analytics","Business intelligence and rental performance",`
    <div class="analytics-toolbar">
      <div>
        <b>Performance Overview</b>
        <small>Interactive admin analytics</small>
      </div>
      <div class="toolbar-actions">
        <select id="analyticsPeriod" onchange="updateAnalyticsPeriod(this.value)">
          <option>Last 7 Months</option><option>Last 30 Days</option><option>This Year</option>
        </select>
        <button class="btn btn-primary" onclick="exportAnalytics()">⬇ Export CSV</button>
      </div>
    </div>

    <section class="stats analytics-kpis">
      ${stat("₹","Revenue","₹84,520","+12.8% vs last month","greenbg")}
      ${stat("📅","Bookings","128","+8.4% vs last month","bluebg")}
      ${stat("🚲","Utilization","72%","+5.2% fleet usage","purplebg")}
      ${stat("👥","Customers","1,248","+14.1% growth","orangebg")}
      ${stat("⭐","Rating","4.8/5","Based on 324 reviews","redbg")}
    </section>

    <section class="grid2">
      <div class="card">
        <div class="card-title">
          <div><h3>Revenue Trend</h3><small class="muted-text">Monthly rental revenue</small></div>
          <span class="live-pill">● Live</span>
        </div>
        <div class="analytics-chart">${bars}</div>
      </div>

      <div class="card">
        <div class="card-title"><div><h3>Booking Conversion</h3><small class="muted-text">Current booking funnel</small></div></div>
        <div class="funnel-row"><span>Bike Views</span><b>1,860</b></div>
        <div class="funnel-track"><i style="width:100%"></i></div>
        <div class="funnel-row"><span>Booking Started</span><b>520</b></div>
        <div class="funnel-track"><i style="width:62%"></i></div>
        <div class="funnel-row"><span>Confirmed</span><b>128</b></div>
        <div class="funnel-track"><i style="width:34%"></i></div>
      </div>
    </section>

    <section class="grid3 analytics-cards">
      <div class="card"><span class="insight-icon">📍</span><h3>Top Pickup Zone</h3><strong>Anna Nagar</strong><p class="muted-text">32% of all pickups</p></div>
      <div class="card"><span class="insight-icon">🚲</span><h3>Best Performing Bike</h3><strong>Electric Bike</strong><p class="muted-text">82% utilization</p></div>
      <div class="card"><span class="insight-icon">⏱</span><h3>Peak Booking Hour</h3><strong>6:00 PM</strong><p class="muted-text">Highest activity window</p></div>
    </section>

    <section class="card">
      <div class="card-title"><div><h3>Performance by Bike Type</h3><small class="muted-text">Fleet efficiency and revenue</small></div></div>
      <div class="table-wrap">
        <table class="table">
          <thead><tr><th>Bike Type</th><th>Total Bikes</th><th>Bookings</th><th>Utilization</th><th>Revenue</th><th>Trend</th></tr></thead>
          <tbody>
            <tr><td>Electric Bike</td><td>90</td><td>54</td><td><span class="metric-good">82%</span></td><td>₹38,400</td><td>↗ 18%</td></tr>
            <tr><td>City Bike</td><td>105</td><td>42</td><td><span class="metric-good">68%</span></td><td>₹25,300</td><td>↗ 9%</td></tr>
            <tr><td>Mountain Bike</td><td>55</td><td>32</td><td><span class="metric-warning">61%</span></td><td>₹20,820</td><td>↗ 5%</td></tr>
          </tbody>
        </table>
      </div>
    </section>
  `);
}

function updateAnalyticsPeriod(value){
  showToast("Analytics updated for " + value);
}

function exportAnalytics(){
  const rows=[
    ["Metric","Value"],
    ["Revenue","84520"],
    ["Bookings","128"],
    ["Fleet Utilization","72%"],
    ["Customers","1248"],
    ["Average Rating","4.8/5"],
    ["Top Pickup Zone","Anna Nagar"],
    ["Best Performing Bike","Electric Bike"]
  ];
  const csv=rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
  const blob=new Blob([csv],{type:"text/csv"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;a.download="bikerental-analytics.csv";a.click();
  URL.revokeObjectURL(url);
  showToast("Analytics CSV exported");
}

function formatExactTime(value){
  const d=new Date(value);
  if(Number.isNaN(d.getTime())) return value || "";
  return d.toLocaleString(undefined,{year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:true});
}
function notificationsPage(){
  const notifications=(backendNotifications.length?backendNotifications:[
    {id:"demo-1",title:"Welcome to BikeRental",message:"Your full-stack project is ready.",read:false,created_at:new Date().toISOString()}
  ]).map((n,i)=>({...n,created_at:formatExactTime(n.created_at)}));
  const unread=notifications.filter(n=>!n.read).length;
  return shell("notifications","Notifications","Bookings, payments, tracking and system alerts",`
    <div class="notification-summary">
      <div><b id="notificationTotal">${notifications.length}</b><span>Total</span></div>
      <div><b id="notificationUnread">${unread}</b><span>Unread</span></div>
      <div><b>2</b><span>High Priority</span></div>
    </div>
    <div class="page-head">
      <div><div class="searchbar notification-search"><input id="notificationSearch" placeholder="Search notifications..." oninput="filterNotifications(this.value)"></div></div>
      <button class="btn btn-primary" onclick="markAllRead()">✓ Mark all as read</button>
    </div>
    <div class="card" id="notificationList">
      ${notifications.map((n,i)=>`
        <div class="notification-item ${n.read?'':'unread'}" data-id="${n.id}" data-search="${n.title} ${n.message}">
          <div class="alert-icon bluebg">🔔</div>
          <div><b>${n.title}</b><p>${n.message}</p><small>${n.created_at}</small></div>
          <div class="notification-actions">
            ${!n.read?'<span class="notification-dot" title="Unread"></span>':''}
            <button class="action-btn" onclick="markNotificationRead(this)">${n.read?'Read':'Mark read'}</button>
          </div>
        </div>`).join("")}
    </div>
  `);
}
function filterNotifications(q){
  q=q.toLowerCase().trim();
  document.querySelectorAll("#notificationList .notification-item").forEach(item=>{
    item.style.display=item.dataset.search.toLowerCase().includes(q)?"":"none";
  });
}

async function markNotificationRead(btn){
  const item=btn.closest(".notification-item");
  const id=item?.dataset.id;
  try{
    if(id && !String(id).startsWith("demo-")) await api(`/notifications/${id}/read`,{method:"POST"});
    item.classList.remove("unread");
    const dot=item.querySelector(".notification-dot"); if(dot)dot.remove();
    btn.textContent="Read"; btn.disabled=true;
    updateNotificationCount();
  }catch(e){showToast(e.message)}
}

async function markAllRead(){
  try{
    const unread=backendNotifications.filter(n=>!n.read);
    for(const n of unread) await api(`/notifications/${n.id}/read`,{method:"POST"});
    backendNotifications=backendNotifications.map(n=>({...n,read:true}));
    document.querySelectorAll(".notification-item").forEach(item=>item.classList.remove("unread"));
    document.querySelectorAll(".notification-dot").forEach(dot=>dot.remove());
    document.querySelectorAll(".notification-actions .action-btn").forEach(btn=>{btn.textContent="Read";btn.disabled=true;});
    updateNotificationCount(); showToast("All notifications marked as read");
  }catch(e){showToast(e.message)}
}

function updateNotificationCount(){
  const count=document.querySelectorAll(".notification-item.unread").length;
  const badge=document.getElementById("notificationCount");
  if(badge)badge.textContent=count;
  const unread=document.getElementById("notificationUnread");
  if(unread)unread.textContent=count;
}

async function render(){
  await syncBackend();
  let page=location.hash.replace("#","")||"landing";
  if(!isLogged() && !["landing","login","register","forgot"].includes(page)) page="login";
  if(isLogged() && ["login","register","forgot"].includes(page)) page="dashboard";
  let out="";
  if(page==="landing")out=landing();
  else if(page==="login")out=auth("login");
  else if(page==="register")out=auth("register");
  else if(page==="forgot")out=auth("forgot");
  else if(page==="dashboard")out=dashboard();
  else if(page==="analytics")out=analyticsPage();
  else if(page==="bikes")out=bikesPage();
  else if(page==="booking")out=bookingPage();
  else if(page==="tracking")out=trackingPage();
  else if(page==="users")out=usersPage();
  else if(page==="maintenance")out=maintenancePage();
  else if(page==="reviews")out=reviewsPage();
  else if(page==="payment")out=paymentPage();
  else if(page==="notifications")out=notificationsPage();
  else if(page==="settings")out=settingsPage();
  else if(page==="profile")out=profilePage();
  else out=landing();
  app.innerHTML=out;
  if(page==="maintenance") setTimeout(loadMaintenance,0);
  if(page==="reviews") setTimeout(loadReviews,0);
  if(page==="booking"){ const d=document.getElementById("bookDate"); if(d && !d.value) d.value=new Date().toISOString().slice(0,10); setTimeout(selectInitialBooking,0); }
  if(page==="notifications")setTimeout(updateNotificationCount,0);
}
window.addEventListener("hashchange",render);
render();
