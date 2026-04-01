document.addEventListener("DOMContentLoaded", () => {
    /* ===== REMOVE .HTML FROM URL ===== */
    (function hideHtmlInURL() {
        const pathname = window.location.pathname;
        if (pathname.endsWith(".html")) {
            // Replace URL in browser without reloading the page
            window.history.replaceState({}, "", pathname.replace(".html", ""));
        }
    })();
   /* ===== REMOVE .HTML FROM URL ===== */
    (function hideHtmlInURL() {
        const pathname = window.location.pathname;
        if (pathname.endsWith(".html")) {
            // Replace URL in browser without reloading the page
            window.history.replaceState({}, "", pathname.replace(".html", ""));
        }
    })();

  const isViewerPage = window.location.pathname.includes("viewer");

  removePastConventions(); // clean up storage first
  loadConventions();       // populate the list (adds missing delete buttons)

  if(!isViewerPage){
      setupAddEventButton();   
      setupDelegatedHandlers();
  }

  if(isViewerPage){
      makeViewerReadOnly();
  }

});


/* =========================
   Default Conventions
========================= */

const defaultConventions = `
<li>
<span class="event-name">Fandomcon</span>
<span class="event-date">November 7-9, 2025</span>
<span class="event-location">San Jose Convention Center</span>
<span class="event-description">Going to hang out for one day</span>
<span class="delete-btn">❌</span>
</li>

<li>
<span class="event-name">TBA 2026</span>
<span class="event-date">TBA</span>
<span class="event-location">TBA</span>
<span class="event-description">Details coming soon!</span>
<span class="delete-btn">❌</span>
</li>
`;


/* =========================
   Load / Ensure / Save
========================= */

function loadConventions(){

const list = document.getElementById("conventionList");
if(!list) return;

const saved = localStorage.getItem("conventionsList");

list.innerHTML = saved || defaultConventions;

ensureDeleteButtons();
enableEditing();
saveConventions();

}

function ensureDeleteButtons(){

const list = document.getElementById("conventionList");
if(!list) return;

list.querySelectorAll("li").forEach(li=>{

if(!li.querySelector(".delete-btn")){

const btn = document.createElement("span");
btn.className="delete-btn";
btn.textContent="❌";
li.appendChild(btn);

}

});

}

function saveConventions(){

const list = document.getElementById("conventionList");
if(!list) return;

localStorage.setItem("conventionsList", list.innerHTML);

}


/* =========================
   Editing
========================= */

function enableEditing(){

const list = document.getElementById("conventionList");
if(!list) return;

const isViewerPage = window.location.pathname.includes("viewer");

list.querySelectorAll("span").forEach(span=>{

if(span.classList.contains("delete-btn")){

span.contentEditable=false;
return;

}

if(isViewerPage){

span.contentEditable=false;

}else{

span.contentEditable=true;

}

});

}


/* =========================
   Delegated Handlers
========================= */

function setupDelegatedHandlers(){

const list = document.getElementById("conventionList");
if(!list) return;

list.addEventListener("click",(e)=>{

const target=e.target;

if(target.classList && target.classList.contains("delete-btn")){

const li=target.closest("li");

if(li){

li.remove();
saveConventions();

}

}

});


list.addEventListener("input",(e)=>{

const target=e.target;

if(target.tagName==="SPAN" && !target.classList.contains("delete-btn")){

saveConventions();

}

});


list.addEventListener("focusout",(e)=>{

const target=e.target;

if(target.tagName==="SPAN" && !target.classList.contains("delete-btn")){

saveConventions();

}

},true);

}


/* =========================
   Add Event Button
========================= */

function setupAddEventButton(){

const button=document.getElementById("addEventButton");
if(!button) return;

button.onclick=function(){

const list=document.getElementById("conventionList");
if(!list) return;

const li=document.createElement("li");

li.innerHTML=`
<span class="event-name">New Event Name</span>
<span class="event-date">Month Day-Day, Year</span>
<span class="event-location">Location</span>
<span class="event-description">Event description</span>
<span class="delete-btn">❌</span>
`;

list.appendChild(li);

ensureDeleteButtons();
enableEditing();
saveConventions();

const nameSpan=li.querySelector(".event-name");
if(nameSpan) nameSpan.focus();

};

}


/* =========================
   Viewer Mode (READ ONLY)
========================= */

function makeViewerReadOnly(){

const list=document.getElementById("conventionList");
if(!list) return;

const deleteButtons=list.querySelectorAll(".delete-btn");

deleteButtons.forEach(btn=>{

btn.remove();

});

const spans=list.querySelectorAll("span");

spans.forEach(span=>{

span.contentEditable=false;

});

const addButton=document.getElementById("addEventButton");

if(addButton){

addButton.style.display="none";

}

}


/* =========================
   Remove Past Conventions
========================= */

function removePastConventions(){

const saved=localStorage.getItem("conventionsList");

const container=document.createElement("ul");

container.innerHTML=saved || defaultConventions;

const today=new Date();

today.setHours(0,0,0,0);

const items=container.querySelectorAll("li");

items.forEach(item=>{

const dateText=item.querySelector(".event-date")?.innerText.trim();

if(!dateText) return;

const endDate=parseConventionDate(dateText);

if(endDate && endDate<today){

item.remove();

}

});

localStorage.setItem("conventionsList",container.innerHTML);

}


/* =========================
   Parse Convention Date
========================= */

function parseConventionDate(text){

if(!text || text.toUpperCase().includes("TBA")) return null;

const iso=/^\d{4}-\d{2}-\d{2}$/;

if(iso.test(text)){

const d=new Date(text);

return isNaN(d)?null:d;

}

const rangeRegex=/([A-Za-z]+)\s+(\d+)\s*[-–]\s*(\d+),?\s*(\d{4})/;

let match=text.match(rangeRegex);

if(match){

const month=match[1];
const endDay=match[3];
const year=match[4];

const d=new Date(`${month} ${endDay}, ${year}`);

return isNaN(d)?null:d;

}

const singleRegex=/([A-Za-z]+)\s+(\d+),?\s*(\d{4})/;

match=text.match(singleRegex);

if(match){

const month=match[1];
const day=match[2];
const year=match[3];

const d=new Date(`${month} ${day}, ${year}`);

return isNaN(d)?null:d;

}

const parsed=new Date(text);

return isNaN(parsed)?null:parsed;

}
