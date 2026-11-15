(function(){
'use strict';

/* ---------- helpers + data model ---------- */
var $=function(s,r){return (r||document).querySelector(s);};
var D=window.nexus||null;
var BLOCKED_TAGS={script:1,style:1,iframe:1,frame:1,frameset:1,object:1,embed:1,link:1,meta:1,base:1,head:1,html:1,body:1,title:1,noscript:1,template:1,slot:1,portal:1,applet:1,foreignobject:1,animate:1,set:1};
var TAG_RE=/^[A-Za-z][A-Za-z0-9-]{0,30}$/;
var SVGCASE={svg:'svg',g:'g',line:'line',rect:'rect',circle:'circle',ellipse:'ellipse',path:'path',polygon:'polygon',polyline:'polyline',text:'text',tspan:'tspan',defs:'defs',lineargradient:'linearGradient',radialgradient:'radialGradient',stop:'stop',clippath:'clipPath',mask:'mask'};
function isObj(o){return o&&typeof o==='object'&&!Array.isArray(o);}
function safeTag(t){t=String(t||'');if(!TAG_RE.test(t)||BLOCKED_TAGS[t.toLowerCase()])throw new Error('That tag is not allowed: '+t);return t;}
function cleanAttrs(a){var o={};if(!isObj(a))return o;Object.keys(a).forEach(function(k){
  if(!/^[a-zA-Z][\w:.-]*$/.test(k))return;var lk=k.toLowerCase();
  if(lk==='style'||lk==='srcdoc'||lk==='contenteditable'||lk==='data-nid')return;
  var v=a[k];if(v===true)v='';if(v===false||v==null)return;o[k]=String(v).slice(0,20000);});return o;}
var probe=document.createElement('div');
function cleanStyle(st){var o={};if(!isObj(st))return o;Object.keys(st).forEach(function(p){
  var v=st[p],name=String(p).replace(/[A-Z]/g,function(m){return '-'+m.toLowerCase();});
  if(!/^(--)?[a-z][a-z0-9-]*$/.test(name))throw new Error('Not a CSS property name: '+p);
  if(v===null||v===undefined||v===''){o[name]=null;return;}
  v=String(v).trim();if(/[{}]|<\/|\/\*/.test(v))throw new Error('Unsafe CSS value for '+name);
  if(name.indexOf('--')!==0){probe.style.cssText='';probe.style.setProperty(name,v);if(!probe.style.getPropertyValue(name))throw new Error('The browser does not accept '+name+': '+v);}
  o[name]=v;});return o;}
function cleanNode(r,d,cnt){
  if(!isObj(r)||d>80||++cnt.n>20000)throw new Error('The file is too large or damaged.');
  var tag=d===0?'body':String(r.tag||'');
  if(d>0&&(!TAG_RE.test(tag)||BLOCKED_TAGS[tag.toLowerCase()]))return null;
  var n={id:nid(),tag:tag,ns:r.ns?1:0,text:typeof r.text==='string'?r.text:'',style:{},attrs:cleanAttrs(r.attrs),children:[]};
  if(isObj(r.style))Object.keys(r.style).forEach(function(k){var v=r.style[k];if(/^(--)?[a-z][a-z0-9-]*$/.test(k)&&typeof v==='string'&&!/[{}]|<\/|\/\*/.test(v))n.style[k]=v;});
  (Array.isArray(r.children)?r.children:[]).forEach(function(c){var cn=cleanNode(c,d+1,cnt);if(cn)n.children.push(cn);});
  return n;}
function cleanState(o){if(!isObj(o)||!isObj(o.root))throw new Error('This is not a NexusStudio project.');
  return {root:cleanNode(o.root,0,{n:0}),css:typeof o.css==='string'?o.css:'',js:typeof o.js==='string'?o.js:'',title:typeof o.title==='string'&&o.title?o.title.slice(0,120):'untitled-page'};}
var VOID={img:1,input:1,hr:1,br:1,wbr:1,source:1,track:1,col:1,area:1};
var CONT={div:1,section:1,header:1,nav:1,main:1,footer:1,article:1,aside:1,form:1,ul:1,ol:1,details:1,table:1,thead:1,tbody:1,tr:1,svg:1,body:1,select:1,ul2:1,
  tfoot:1,td:1,th:1,colgroup:1,li:1,dl:1,menu:1,figure:1,fieldset:1,blockquote:1,dialog:1,hgroup:1,search:1,picture:1,map:1,datalist:1,optgroup:1,address:1};
var SVGNS='http://www.w3.org/2000/svg';
var KEY='nexusstudio.draft.v2';
var uid=0;
function nid(){uid++;return 'n'+uid;}
function N(tag,o){o=o||{};return {id:nid(),tag:tag,ns:o.ns?1:0,text:o.text||'',style:o.style||{},attrs:o.attrs||{},children:o.children||[]};}
function clone(n){var c=JSON.parse(JSON.stringify(n));(function re(x){x.id=nid();x.children.forEach(re);})(c);return c;}

var S={root:null,css:'',js:'',title:'nebula-landing-v2',sel:null,collapsed:{},open:{layout:1,box:1,type:1,flex:1,bg:1,border:1},
  view:'canvas',zoom:1,dw:880,dh:640,rtab:'css',ltab:'el',logical:false,pending:{},grid:true,rulers:true};
var hist=[],hi=-1,dragId=null;

function find(id,n,parent,idx){n=n||S.root;if(n.id===id)return {node:n,parent:parent||null,index:idx||0};
  for(var i=0;i<n.children.length;i++){var r=find(id,n.children[i],n,i);if(r)return r;}return null;}
function walk(n,fn,d){fn(n,d||0);n.children.forEach(function(c){walk(c,fn,(d||0)+1);});}
function contains(a,id){var f=false;walk(a,function(n){if(n.id===id)f=true;});return f;}
function pathTo(id){var out=[];(function rec(n,acc){var a=acc.concat([n]);if(n.id===id){out=a;return true;}for(var i=0;i<n.children.length;i++){if(rec(n.children[i],a))return true;}return false;})(S.root,[]);return out;}
function fixUid(){var m=0;walk(S.root,function(n){var k=parseInt(n.id.slice(1),10);if(k>m)m=k;});if(m>uid)uid=m;}

/* ---------- starter content ---------- */
function sample(){
  function btn(t,st){return N('button',{text:t,style:Object.assign({'padding':'8px 18px','border-radius':'6px','font-size':'12px','font-weight':'600','font-family':'inherit','cursor':'pointer'},st)});}
  function link(t){return N('a',{text:t,attrs:{href:'#'},style:{color:'#cbd5e1','text-decoration':'none'}});}
  function stat(l,v,c){return N('div',{style:{background:'rgba(2,6,23,.6)','border':'1px solid #1e293b','border-radius':'6px',padding:'10px','text-align':'left'},children:[
    N('div',{text:l,style:{'font-size':'11px',color:'#94a3b8'}}),N('div',{text:v,style:{'font-family':"'JetBrains Mono', monospace",'font-weight':'700','font-size':'15px',color:c,'margin-top':'2px'}})]});}
  var header=N('header',{style:{display:'flex','align-items':'center','justify-content':'space-between','flex-wrap':'wrap',gap:'12px',padding:'12px 24px','border-bottom':'1px solid #1e293b',background:'rgba(15,23,42,.9)'},children:[
    N('div',{style:{display:'flex','align-items':'center',gap:'10px'},children:[
      N('div',{text:'▲',style:{width:'28px',height:'28px','border-radius':'6px',background:'linear-gradient(135deg,#06b6d4,#2563eb)',display:'flex','align-items':'center','justify-content':'center','font-weight':'700','font-size':'12px',color:'#fff'}}),
      N('span',{text:'HyperScale Cloud',style:{'font-weight':'700','font-size':'14px'}})]}),
    N('nav',{style:{display:'flex',gap:'22px','font-size':'12px','font-weight':'500'},children:[link('Features'),link('Solutions'),link('Pricing'),link('Documentation')]}),
    N('div',{style:{display:'flex','align-items':'center',gap:'10px'},children:[
      btn('Log In',{background:'transparent',border:'0',color:'#cbd5e1'}),btn('Start Free Trial',{background:'#2563eb',border:'0',color:'#fff'})]})]});
  var hero=N('section',{style:{display:'flex','flex-direction':'column','align-items':'center','text-align':'center',gap:'18px',padding:'48px 32px',background:'linear-gradient(180deg,rgba(15,23,42,.6),#020617)'},children:[
    N('span',{text:'Version 3.4 is live with instant zero-config deployments',style:{padding:'4px 12px','border-radius':'999px',background:'rgba(59,130,246,.1)',border:'1px solid rgba(59,130,246,.25)',color:'#60a5fa','font-size':'11px','font-weight':'500'}}),
    N('h1',{text:'Next-generation infrastructure engineered for scale.',style:{'font-size':'44px','font-weight':'800','letter-spacing':'-0.025em','line-height':'1.15','max-width':'720px',margin:'0',color:'#ffffff'}}),
    N('p',{text:'Deploy containerized workloads, distributed databases, and automated edge routing in seconds with production-ready security baked in.',style:{'max-width':'580px','font-size':'14px','line-height':'1.6',color:'#94a3b8',margin:'0'}}),
    N('div',{style:{display:'flex','flex-wrap':'wrap','justify-content':'center',gap:'14px'},children:[
      btn('Deploy Cluster →',{background:'#2563eb',border:'0',color:'#fff','padding':'10px 24px','box-shadow':'0 8px 20px rgba(37,99,235,.3)'}),
      btn('View Benchmarks',{background:'#1e293b',border:'1px solid #334155',color:'#e2e8f0','padding':'10px 20px'})]}),
    N('div',{style:{width:'100%','max-width':'680px',border:'1px solid #1e293b',background:'rgba(15,23,42,.6)','border-radius':'8px',padding:'16px',display:'flex','flex-direction':'column',gap:'12px','margin-top':'12px'},children:[
      N('div',{style:{display:'flex','justify-content':'space-between','align-items':'center',gap:'8px','flex-wrap':'wrap','padding-bottom':'10px','border-bottom':'1px solid #1e293b'},children:[
        N('span',{text:'cluster-preview-us-east.yaml',style:{'font-family':"'JetBrains Mono', monospace",'font-size':'11px',color:'#94a3b8'}}),
        N('span',{text:'status: healthy',style:{'font-family':"'JetBrains Mono', monospace",'font-size':'11px',color:'#34d399',background:'rgba(52,211,153,.1)',padding:'2px 8px','border-radius':'4px'}})]}),
      N('div',{style:{display:'grid','grid-template-columns':'repeat(auto-fit,minmax(150px,1fr))',gap:'12px'},children:[stat('Total Throughput','14.8 Gbps','#ffffff'),stat('Global Edge Latency','11.4 ms','#22d3ee'),stat('Success Rate','99.992%','#34d399')]})]})]});
  var footer=N('footer',{style:{display:'flex','justify-content':'space-between','flex-wrap':'wrap',gap:'10px',padding:'16px 24px','border-top':'1px solid #1e293b',color:'#64748b','font-size':'11px'},children:[
    N('div',{text:'© 2025 HyperScale Cloud Inc. All rights reserved.'}),
    N('div',{style:{display:'flex',gap:'16px'},children:[N('a',{text:'Privacy Policy',attrs:{href:'#'},style:{color:'inherit','text-decoration':'none'}}),N('a',{text:'Terms of Service',attrs:{href:'#'},style:{color:'inherit','text-decoration':'none'}}),N('a',{text:'System Status',attrs:{href:'#'},style:{color:'inherit','text-decoration':'none'}})]})]});
  var root=N('body',{style:{background:'#020617',color:'#f1f5f9','font-family':"'Plus Jakarta Sans', system-ui, sans-serif"},children:[header,hero,footer]});
  return {root:root,css:'',js:'',title:'nebula-landing-v2'};
}
function blank(){return {root:N('body',{style:{background:'#ffffff',color:'#18181b','font-family':"'Plus Jakarta Sans', system-ui, sans-serif",padding:'24px'}}),css:'',js:'',title:'untitled-page'};}

/* ---------- element palette ---------- */
var PAL=[
 {g:'Layout',c:'c-l',b:{div:'<>',section:'§',header:'H',nav:'N',main:'M',footer:'F',hr:'HR'},i:[['div','Generic box'],['section','Semantic section'],['header','Top region'],['nav','Nav list'],['main','Primary container'],['footer','Bottom region'],['hr','Divider line']]},
 {g:'Text',c:'c-t',b:{h1:'H1',h2:'H2',h3:'H3',h4:'H4',h5:'H5',h6:'H6',p:'P',span:'T',br:'BR',wbr:'WBR'},i:[['h1','Primary heading'],['h2','Sub heading'],['h3','Heading level 3'],['h4','Heading level 4'],['h5','Heading level 5'],['h6','Heading level 6'],['p','Paragraph text'],['span','Inline text'],['br','Line break'],['wbr','Word break chance']]},
 {g:'Text Formatting',c:'c-t',b:{strong:'STR',em:'EM',b:'B',i:'I',u:'U',s:'S',small:'SM',mark:'MRK',sub:'SUB',sup:'SUP',del:'DEL',ins:'INS'},i:[['strong','Important text'],['em','Emphasised text'],['b','Bold text'],['i','Italic text'],['u','Underlined text'],['s','Struck-through'],['small','Small print'],['mark','Highlighted text'],['sub','Subscript'],['sup','Superscript'],['del','Deleted text'],['ins','Inserted text']]},
 {g:'Quotes & Code',c:'c-p',b:{blockquote:'BQ',q:'Q',cite:'CIT',pre:'PRE',code:'COD',kbd:'KBD',samp:'SMP',var:'VAR'},i:[['blockquote','Block quotation'],['q','Inline quotation'],['cite','Work title'],['pre','Preformatted text'],['code','Code snippet'],['kbd','Keyboard input'],['samp','Sample output'],['var','Variable name']]},
 {g:'Inline Details',c:'c-p',b:{abbr:'ABR',dfn:'DFN',time:'TIM',data:'DAT',bdi:'BDI',bdo:'BDO',ruby:'RBY',rt:'RT',rp:'RP'},i:[['abbr','Abbreviation'],['dfn','Defined term'],['time','Date or time'],['data','Machine value'],['bdi','Isolated direction'],['bdo','Override direction'],['ruby','Ruby annotation'],['rt','Ruby text (in ruby)'],['rp','Ruby fallback (in ruby)']]},
 {g:'Media',c:'c-m',b:{img:'IMG',video:'VID',audio:'AUD',svg:'SVG',canvas:'CNV',picture:'PIC',source:'SRC',track:'TRK',figure:'FIG',figcaption:'FCP',map:'MAP',area:'ARE'},i:[['img','Image'],['video','Video player'],['audio','Audio player'],['svg','SVG graphic'],['canvas','Drawing surface'],['picture','Responsive image'],['source','Media source (in picture/video/audio)'],['track','Captions (in video/audio)'],['figure','Media with caption'],['figcaption','Caption (in figure)'],['map','Image map'],['area','Map area (in map)']]},
 {g:'Links & Buttons',c:'c-t',b:{a:'A',button:'BTN'},i:[['a','Anchor link'],['button','Button element']]},
 {g:'Forms',c:'c-f',b:{input:'IN',textarea:'TX',select:'SEL',form:'FRM',label:'LBL',fieldset:'FS',legend:'LEG'},i:[['input','Text / number'],['textarea','Multiline text'],['select','Dropdown'],['form','Form wrapper'],['label','Field label'],['fieldset','Field group'],['legend','Group title (in fieldset)']]},
 {g:'Form Extras',c:'c-f',b:{option:'OPT',optgroup:'OGR',datalist:'DTL',output:'OUT',progress:'PRG',meter:'MTR'},i:[['option','Choice (in select)'],['optgroup','Choice group (in select)'],['datalist','Suggestions list'],['output','Calculated result'],['progress','Progress bar'],['meter','Gauge']]},
 {g:'Lists & Tables',c:'c-f',b:{ul:'UL',ol:'OL',li:'LI',dl:'DL',dt:'DT',dd:'DD',menu:'MNU',table:'TBL'},i:[['ul','Bulleted list'],['ol','Numbered list'],['li','List item (in list)'],['dl','Description list'],['dt','Term (in dl)'],['dd','Description (in dl)'],['menu','Toolbar list'],['table','Table']]},
 {g:'Table Parts',c:'c-f',b:{caption:'CAP',thead:'THD',tbody:'TBD',tfoot:'TFT',tr:'TR',th:'TH',td:'TD',colgroup:'CGP',col:'COL'},i:[['caption','Table title (in table)'],['thead','Header rows (in table)'],['tbody','Body rows (in table)'],['tfoot','Footer rows (in table)'],['tr','Row (in table)'],['th','Header cell (in row)'],['td','Data cell (in row)'],['colgroup','Column group (in table)'],['col','Column (in colgroup)']]},
 {g:'Semantic',c:'c-f',b:{article:'ART',aside:'ASD',details:'DET',summary:'SUM',dialog:'DLG',address:'ADR',hgroup:'HGR',search:'SRH'},i:[['article','Standalone post'],['aside','Complementary'],['details','Disclosure'],['summary','Disclosure label (in details)'],['dialog','Dialog box'],['address','Contact info'],['hgroup','Heading + subtitle'],['search','Search region']]}
];
var PLACE="data:image/svg+xml;utf8,"+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="480" height="300" viewBox="0 0 480 300"><rect width="480" height="300" fill="#27272a"/><path d="M0 240l130-90 90 60 110-110 150 120v80H0z" fill="#3f3f46"/><circle cx="360" cy="80" r="30" fill="#52525b"/></svg>');
/* ---------- browser default styles ----------
   What each element looks like with no CSS at all. They are stored on the element when it is added,
   so they show on the canvas and in the CSS tab. Any starter style below that sets the same property wins. */
var UA={};
function ua(tags,st){tags.split(' ').forEach(function(t){UA[t]=Object.assign(UA[t]||{},st);});}
PAL.forEach(function(g){g.i.forEach(function(it){UA[it[0]]={display:'inline',position:'static',margin:'0',padding:'0'};});});
ua('div section header nav main footer article aside form hgroup search address details summary figcaption legend fieldset blockquote figure dl dt dd menu ul ol p h1 h2 h3 h4 h5 h6 pre hr dialog',{display:'block',width:'auto',height:'auto'});
ua('option optgroup',{display:'block'});
ua('li',{display:'list-item'});
ua('p dl menu ul ol pre',{margin:'1em 0'});
ua('ul ol menu',{padding:'0 0 0 40px'});
ua('h1',{'font-size':'2em','font-weight':'700',margin:'0.67em 0'});
ua('h2',{'font-size':'1.5em','font-weight':'700',margin:'0.83em 0'});
ua('h3',{'font-size':'1.17em','font-weight':'700',margin:'1em 0'});
ua('h4',{'font-size':'1em','font-weight':'700',margin:'1.33em 0'});
ua('h5',{'font-size':'0.83em','font-weight':'700',margin:'1.67em 0'});
ua('h6',{'font-size':'0.67em','font-weight':'700',margin:'2.33em 0'});
ua('blockquote figure',{margin:'1em 40px'});
ua('dd',{margin:'0 0 0 40px'});
ua('address',{'font-style':'italic'});
ua('hr',{margin:'0.5em auto',border:'1px inset',overflow:'hidden'});
ua('fieldset',{margin:'0 2px',padding:'0.35em 0.75em 0.625em',border:'2px groove'});
ua('legend',{padding:'0 2px'});
ua('dialog',{width:'fit-content',height:'fit-content'});
ua('pre',{'font-family':'monospace','white-space':'pre'});
ua('code kbd samp',{'font-family':'monospace'});
ua('strong b',{'font-weight':'700'});
ua('em i cite dfn var',{'font-style':'italic'});
ua('u ins',{'text-decoration':'underline'});
ua('s del',{'text-decoration':'line-through'});
ua('abbr',{'text-decoration':'underline dotted'});
ua('small sub sup',{'font-size':'smaller'});
ua('sub',{'vertical-align':'sub'});
ua('sup',{'vertical-align':'super'});
ua('mark',{'background-color':'yellow',color:'black'});
ua('a',{color:'#0000ee','text-decoration':'underline',cursor:'pointer'});
ua('img video canvas',{width:'auto',height:'auto'});
ua('audio',{display:'inline-block',width:'300px',height:'54px'});
ua('input button select textarea progress meter',{display:'inline-block',width:'auto',height:'auto'});
ua('input',{padding:'1px 2px','font-size':'13.3333px'});
ua('textarea',{padding:'2px','font-size':'13.3333px','font-family':'monospace'});
ua('select',{'font-size':'13.3333px'});
ua('button',{padding:'1px 6px','font-size':'13.3333px','text-align':'center',cursor:'default'});
ua('progress',{width:'10em',height:'1em'});
ua('meter',{width:'5em',height:'1em'});
ua('table',{display:'table',width:'auto',height:'auto','border-collapse':'separate','border-spacing':'2px'});
ua('caption',{display:'table-caption','text-align':'center'});
ua('thead',{display:'table-header-group'});
ua('tbody',{display:'table-row-group'});
ua('tfoot',{display:'table-footer-group'});
ua('tr',{display:'table-row'});
ua('td th',{display:'table-cell',padding:'1px'});
ua('th',{'font-weight':'700','text-align':'center'});
ua('colgroup',{display:'table-column-group'});
ua('col',{display:'table-column'});
ua('ruby',{display:'ruby'});
ua('rt',{display:'ruby-text'});
ua('datalist source track area rp',{display:'none'});
Object.keys(UA).forEach(function(k){if(UA[k].display==='none')UA[k]={display:'none'};});
function applyUA(n){
  if(!n.ns||n.tag==='svg'){var d=UA[n.tag];if(d)n.style=Object.assign({},d,n.style);}
  n.children.forEach(applyUA);
  return n;
}
var FIELDSTY={padding:'8px 12px',border:'1px solid #475569','border-radius':'6px',background:'transparent',color:'inherit','font-family':'inherit','font-size':'14px'};
function make(tag){return applyUA(makeRaw(tag));}
function makeRaw(tag){
  var soft={background:'rgba(148,163,184,.12)'};
  function cell(t,h){return N(h?'th':'td',{text:t,style:{padding:'8px 12px',border:'1px solid #475569','text-align':'left'}});}
  function box(extra){return Object.assign({padding:'16px','min-height':'64px'},soft,extra||{});}
  var o=function(a,b){return Object.assign({},a,b||{});};
  switch(tag){
   case 'div':return N('div',{style:box()});
   case 'section':return N('section',{style:box({padding:'32px','min-height':'96px'})});
   case 'header':return N('header',{style:box({display:'flex','align-items':'center','justify-content':'space-between'}),children:[N('span',{text:'Brand',style:{'font-weight':'700'}}),N('span',{text:'Menu'})]});
   case 'nav':return N('nav',{style:{display:'flex',gap:'16px',padding:'12px 0'},children:[N('a',{text:'Home',attrs:{href:'#'}}),N('a',{text:'About',attrs:{href:'#'}}),N('a',{text:'Contact',attrs:{href:'#'}})]});
   case 'main':return N('main',{style:box({'min-height':'160px'})});
   case 'footer':return N('footer',{style:box({'text-align':'center'}),children:[N('span',{text:'© Your company'})]});
   case 'article':return N('article',{style:box(),children:[N('h2',{text:'Article title',style:{margin:'0 0 8px'}}),N('p',{text:'A short summary of the article goes here.',style:{margin:'0'}})]});
   case 'aside':return N('aside',{style:box({width:'240px','max-width':'100%'}),children:[N('p',{text:'Side note',style:{margin:'0'}})]});
   case 'details':return N('details',{style:{padding:'8px 12px',border:'1px solid #475569','border-radius':'6px'},children:[N('summary',{text:'Click to expand',style:{cursor:'pointer'}}),N('p',{text:'Hidden content appears here.',style:{margin:'8px 0 0'}})]});
   case 'h1':return N('h1',{text:'Your headline here',style:{'font-size':'40px','font-weight':'800','line-height':'1.15',margin:'0'}});
   case 'h2':return N('h2',{text:'A supporting heading',style:{'font-size':'28px','font-weight':'700','line-height':'1.2',margin:'0'}});
   case 'p':return N('p',{text:'Write something helpful here. Double-click this text on the canvas to edit it.',style:{'line-height':'1.6',margin:'0'}});
   case 'span':return N('span',{text:'Inline text'});
   case 'img':return N('img',{attrs:{src:PLACE,alt:'Placeholder image'},style:{width:'240px','max-width':'100%','border-radius':'8px',display:'block'}});
   case 'video':return N('video',{attrs:{controls:''},style:{width:'320px','max-width':'100%','background':'#000','border-radius':'8px'}});
   case 'audio':return N('audio',{attrs:{controls:''},style:{display:'block'}});
   case 'a':return N('a',{text:'Link text',attrs:{href:'#'},style:{color:'#3b82f6'}});
   case 'button':return N('button',{text:'Button',style:{padding:'8px 16px',background:'#3b82f6',color:'#fff',border:'0','border-radius':'6px','font-weight':'600','font-family':'inherit',cursor:'pointer'}});
   case 'input':return N('input',{attrs:{type:'text',placeholder:'Type here'},style:FIELDSTY});
   case 'textarea':return N('textarea',{attrs:{rows:'3',placeholder:'Write a message'},style:o(FIELDSTY,{width:'100%'})});
   case 'select':return N('select',{style:FIELDSTY,children:[N('option',{text:'Option 1'}),N('option',{text:'Option 2'}),N('option',{text:'Option 3'})]});
   case 'form':return N('form',{style:{display:'flex','flex-direction':'column',gap:'12px',padding:'16px','max-width':'360px'},children:[make('input'),make('button')]});
   case 'ul':case 'ol':return N(tag,{style:{padding:'0 0 0 24px',margin:'0'},children:[N('li',{text:'First item'}),N('li',{text:'Second item'}),N('li',{text:'Third item'})]});
   case 'table':
     var td=function(t,h){return N(h?'th':'td',{text:t,style:{padding:'8px 12px',border:'1px solid #475569','text-align':'left'}});};
     return N('table',{style:{'border-collapse':'collapse',width:'100%'},children:[N('tbody',{children:[N('tr',{children:[td('Name',1),td('Role',1)]}),N('tr',{children:[td('Ada'),td('Engineer')]}),N('tr',{children:[td('Lin'),td('Designer')]})]})]});
   /* layout + text */
   case 'hr':return N('hr');
   case 'h3':return N('h3',{text:'Heading level 3'});
   case 'h4':return N('h4',{text:'Heading level 4'});
   case 'h5':return N('h5',{text:'Heading level 5'});
   case 'h6':return N('h6',{text:'Heading level 6'});
   case 'br':return N('br');
   case 'wbr':return N('wbr');
   /* text formatting */
   case 'strong':return N('strong',{text:'Important text'});
   case 'em':return N('em',{text:'Emphasised text'});
   case 'b':return N('b',{text:'Bold text'});
   case 'i':return N('i',{text:'Italic text'});
   case 'u':return N('u',{text:'Underlined text'});
   case 's':return N('s',{text:'Struck-through text'});
   case 'small':return N('small',{text:'Small print'});
   case 'mark':return N('mark',{text:'Highlighted text'});
   case 'sub':return N('sub',{text:'Subscript'});
   case 'sup':return N('sup',{text:'Superscript'});
   case 'del':return N('del',{text:'Deleted text'});
   case 'ins':return N('ins',{text:'Inserted text'});
   /* quotes + code */
   case 'blockquote':return N('blockquote',{children:[N('p',{text:'A quotation goes here.'})]});
   case 'q':return N('q',{text:'A short inline quote'});
   case 'cite':return N('cite',{text:'Title of a work'});
   case 'pre':return N('pre',{text:'Preformatted text\n  keeps its spacing'});
   case 'code':return N('code',{text:'const x = 1;'});
   case 'kbd':return N('kbd',{text:'Ctrl + S'});
   case 'samp':return N('samp',{text:'Sample output'});
   case 'var':return N('var',{text:'x'});
   /* inline details */
   case 'abbr':return N('abbr',{text:'HTML',attrs:{title:'HyperText Markup Language'}});
   case 'dfn':return N('dfn',{text:'Defined term'});
   case 'time':return N('time',{text:'14 Nov 2026',attrs:{datetime:'2026-11-14'}});
   case 'data':return N('data',{text:'Item',attrs:{value:'42'}});
   case 'bdi':return N('bdi',{text:'Isolated text'});
   case 'bdo':return N('bdo',{text:'Reversed text',attrs:{dir:'rtl'}});
   case 'ruby':return N('ruby',{text:'漢',children:[N('rp',{text:'('}),N('rt',{text:'kan'}),N('rp',{text:')'})]});
   case 'rt':return N('rt',{text:'Annotation'});
   case 'rp':return N('rp',{text:'('});
   /* media */
   case 'svg':return N('svg',{ns:1,attrs:{width:'120',height:'120',viewBox:'0 0 120 120'},style:{width:'120px',height:'120px'},children:[
     N('rect',{ns:1,attrs:{width:'120',height:'120',rx:'16'},style:{fill:'#1e293b'}}),
     N('circle',{ns:1,attrs:{cx:'60',cy:'60',r:'30'},style:{fill:'#3b82f6'}})]});
   case 'canvas':return N('canvas',{attrs:{width:'300',height:'150'},style:{'max-width':'100%','background':'rgba(148,163,184,.12)','border-radius':'8px'}});
   case 'picture':return N('picture',{children:[N('source',{attrs:{media:'(min-width: 800px)',srcset:PLACE}}),make('img')]});
   case 'source':return N('source',{attrs:{media:'(min-width: 800px)',srcset:PLACE}});
   case 'track':return N('track',{attrs:{kind:'captions',srclang:'en',label:'English'}});
   case 'figure':return N('figure',{children:[make('img'),make('figcaption')]});
   case 'figcaption':return N('figcaption',{text:'Caption text'});
   case 'map':return N('map',{attrs:{name:'image-map'},children:[make('area')]});
   case 'area':return N('area',{attrs:{shape:'rect',coords:'0,0,100,100',href:'#',alt:'Clickable area'}});
   /* forms */
   case 'label':return N('label',{text:'Field label'});
   case 'fieldset':return N('fieldset',{children:[make('legend'),make('input')]});
   case 'legend':return N('legend',{text:'Group title'});
   case 'option':return N('option',{text:'Option'});
   case 'optgroup':return N('optgroup',{attrs:{label:'Group'},children:[N('option',{text:'Option 1'}),N('option',{text:'Option 2'})]});
   case 'datalist':return N('datalist',{children:[N('option',{attrs:{value:'Suggestion 1'}}),N('option',{attrs:{value:'Suggestion 2'}})]});
   case 'output':return N('output',{text:'Result: 42'});
   case 'progress':return N('progress',{attrs:{value:'60',max:'100'}});
   case 'meter':return N('meter',{attrs:{value:'0.6',min:'0',max:'1'}});
   /* lists + tables */
   case 'li':return N('li',{text:'List item'});
   case 'dl':return N('dl',{children:[make('dt'),make('dd')]});
   case 'dt':return N('dt',{text:'Term'});
   case 'dd':return N('dd',{text:'Description of the term.'});
   case 'menu':return N('menu',{children:[N('li',{text:'Action one'}),N('li',{text:'Action two'})]});
   case 'caption':return N('caption',{text:'Table caption'});
   case 'thead':return N('thead',{children:[N('tr',{children:[cell('Name',1),cell('Role',1)]})]});
   case 'tbody':return N('tbody',{children:[N('tr',{children:[cell('Ada'),cell('Engineer')]}),N('tr',{children:[cell('Lin'),cell('Designer')]})]});
   case 'tfoot':return N('tfoot',{children:[N('tr',{children:[cell('Total'),cell('2')]})]});
   case 'tr':return N('tr',{children:[cell('Cell'),cell('Cell')]});
   case 'th':return cell('Header',1);
   case 'td':return cell('Cell');
   case 'colgroup':return N('colgroup',{children:[N('col'),N('col')]});
   case 'col':return N('col');
   /* semantic */
   case 'summary':return N('summary',{text:'Click to expand'});
   case 'dialog':return N('dialog',{attrs:{open:''},style:{position:'relative',inset:'auto',margin:'0',padding:'16px',border:'1px solid #475569','border-radius':'8px',background:'transparent',color:'inherit'},children:[N('p',{text:'Dialog content goes here.',style:{margin:'0'}})]});
   case 'address':return N('address',{text:'Your name, 12 Example Street, City'});
   case 'hgroup':return N('hgroup',{children:[N('h2',{text:'Main title'}),N('p',{text:'Supporting subtitle'})]});
   case 'search':return N('search',{children:[N('input',{attrs:{type:'search',placeholder:'Search…'},style:FIELDSTY})]});
   case 'line':return svgWrap(N('line',{ns:1,attrs:{x1:'10',y1:'10',x2:'110',y2:'110'},style:{stroke:'#60a5fa','stroke-width':'4','stroke-linecap':'round'}}));
   case 'rect':return svgWrap(N('rect',{ns:1,attrs:{x:'10',y:'10',width:'100',height:'100',rx:'10'},style:{fill:'#3b82f6'}}));
   case 'circle':return svgWrap(N('circle',{ns:1,attrs:{cx:'60',cy:'60',r:'48'},style:{fill:'#06b6d4'}}));
   case 'ellipse':return svgWrap(N('ellipse',{ns:1,attrs:{cx:'60',cy:'60',rx:'52',ry:'34'},style:{fill:'#a78bfa'}}));
   case 'path':return svgWrap(N('path',{ns:1,attrs:{d:'M10 100 Q60 -20 110 100 Z'},style:{fill:'#f97316'}}));
  }
  return N(tag,{text:tag});
}
function svgWrap(child){return N('svg',{ns:1,attrs:{width:'120',height:'120',viewBox:'0 0 120 120'},style:{display:'block'},children:[child]});}

/* ---------- CSS property catalogue ---------- */
var SECTIONS=[
 {k:'layout',name:'Layout & Positioning',hint:function(n){return (n.style.display||'block')+' · '+(n.style.position||'static');},rows:[
   [{p:'display',t:'select',o:['block','inline','inline-block','flex','inline-flex','grid','none','inline-grid','flow-root','contents','list-item','table','inline-table','table-row','table-cell','table-caption','table-column','table-row-group','table-header-group','table-footer-group','table-column-group','ruby','ruby-text']},{p:'position',t:'select',o:['static','relative','absolute','fixed','sticky']}],
   ['INSETS'],
   [{p:'float',t:'select',o:['none','left','right','inline-start','inline-end']},{p:'clear',t:'select',o:['none','both','left','right','inline-start','inline-end']},{p:'visibility',t:'select',o:['visible','hidden','collapse']},{p:'z-index'}]]},
 {k:'box',name:'Box Model & Spacing',hint:function(n,el){return el?Math.round(el.offsetWidth)+' × '+Math.round(el.offsetHeight):'';},rows:[
   ['BOXMODEL'],
   [{p:'width'},{p:'min-width',l:'Min W'},{p:'max-width',l:'Max W'}],
   [{p:'height'},{p:'min-height',l:'Min H'},{p:'max-height',l:'Max H'}],
   [{p:'margin',l:'Margin (T R B L)'}],['SIDES','margin'],[{p:'padding',l:'Padding (T R B L)'}],['SIDES','padding'],
   [{p:'box-sizing',t:'select',o:['border-box','content-box']},{p:'overflow',t:'select',o:['visible','hidden','auto','scroll','clip']}]]},
 {k:'type',name:'Typography',hint:function(n,el){return el?(getComputedStyle(el).fontSize):'';},rows:[
   [{p:'font-family',t:'select',o:["'Plus Jakarta Sans', sans-serif","'JetBrains Mono', monospace","system-ui, sans-serif","Georgia, serif","'Courier New', monospace","Arial, Helvetica, sans-serif","'Helvetica Neue', Helvetica, sans-serif","Verdana, Geneva, sans-serif","Tahoma, Geneva, sans-serif","'Trebuchet MS', sans-serif","'Times New Roman', Times, serif","Garamond, serif","'Palatino Linotype', Palatino, serif","'Segoe UI', sans-serif","ui-sans-serif, sans-serif","ui-serif, serif","ui-monospace, monospace","ui-rounded, sans-serif","serif","sans-serif","monospace","cursive","fantasy"]}],
   [{p:'font-size'},{p:'font-weight',t:'select',o:['300','400','500','600','700','800','100','200','900','normal','bold','lighter','bolder']}],
   [{p:'line-height'},{p:'letter-spacing'}],
   [{p:'text-align',t:'align'},{p:'color',t:'color'}],
   [{p:'text-transform',t:'select',o:['none','uppercase','lowercase','capitalize','full-width','full-size-kana']},{p:'font-style',t:'select',o:['normal','italic','oblique']},{p:'text-decoration',t:'select',o:['none','underline','line-through','overline','underline overline','underline line-through','underline dotted','underline dashed','underline wavy']}],
   [{p:'text-shadow'}],
   [{p:'white-space',t:'select',o:['normal','nowrap','pre-wrap','pre','pre-line','break-spaces']},{p:'text-wrap',t:'select',o:['wrap','nowrap','balance','pretty','stable']}]]},
 {k:'flex',name:'Flexbox',hint:function(n){return n.style.display==='flex'?'container':'set display: flex';},rows:[
   [{p:'flex-direction',t:'select',o:['row','row-reverse','column','column-reverse']},{p:'flex-wrap',t:'select',o:['nowrap','wrap','wrap-reverse']}],
   [{p:'justify-content',t:'select',o:['flex-start','flex-end','center','space-between','space-around','space-evenly','start','end','left','right','stretch','normal']},{p:'align-items',t:'select',o:['stretch','flex-start','flex-end','center','baseline','start','end','normal','self-start','self-end','first baseline','last baseline']}],
   [{p:'gap'}],
   [{p:'flex',l:'Flex item'},{p:'align-self',t:'select',o:['auto','stretch','flex-start','flex-end','center','normal','start','end','self-start','self-end','baseline']},{p:'order'}]]},
 {k:'grid',name:'CSS Grid',hint:function(){return 'grid-template';},rows:[
   [{p:'grid-template-columns',l:'Template cols'},{p:'grid-template-rows',l:'Template rows'}],
   [{p:'grid-column'},{p:'grid-auto-flow',t:'select',o:['row','column','dense','row dense','column dense']}],
   [{p:'row-gap'},{p:'column-gap'}]]},
 {k:'bg',name:'Background',hint:function(n){return n.style['background-color']||n.style.background||'transparent';},rows:[
   [{p:'background-color',t:'color',l:'Background color'}],[{p:'background',l:'Background (shorthand, gradients)'}],[{p:'background-image'}],
   [{p:'background-size',t:'select',o:['auto','cover','contain']},{p:'background-repeat',t:'select',o:['repeat','no-repeat','repeat-x','repeat-y','space','round']},{p:'background-position'}]]},
 {k:'border',name:'Border & Outline',hint:function(n){return n.style.border||'none';},rows:[
   [{p:'border',l:'Border (e.g. 1px solid #fff)'}],[{p:'border-radius',l:'Border radius'}],
   [{p:'outline'},{p:'outline-offset'}],[{p:'box-shadow'}]]},
 {k:'fx',name:'Effects & Transforms',hint:function(){return 'opacity · filter';},rows:[
   [{p:'opacity',t:'range'}],[{p:'filter'},{p:'backdrop-filter'}],
   [{p:'mix-blend-mode',t:'select',o:['normal','multiply','screen','overlay','difference','darken','lighten','color-dodge','color-burn','hard-light','soft-light','exclusion','hue','saturation','color','luminosity','plus-lighter']},{p:'cursor',t:'select',o:['auto','pointer','text','move','not-allowed','default','none','context-menu','help','progress','wait','cell','crosshair','vertical-text','alias','copy','no-drop','grab','grabbing','all-scroll','col-resize','row-resize','n-resize','e-resize','s-resize','w-resize','ne-resize','nw-resize','se-resize','sw-resize','ew-resize','ns-resize','nesw-resize','nwse-resize','zoom-in','zoom-out']}],
   [{p:'transition'},{p:'transform'}]]}
];
var PHYS=['top','right','bottom','left'];
var SIDE=PHYS;
var LOGI=['inset','inset-block','inset-inline','inset-block-start','inset-block-end','inset-inline-start','inset-inline-end'];
var KNOWN={};
/* common values per property, offered as autocomplete on the text fields; any other value can still be typed */
var GLOBALV=['inherit','initial','unset','revert','revert-layer'];
var VALS={};
(function(){
  var SPEC=[
   'width,height,inline-size,block-size: auto|fit-content|min-content|max-content|stretch|100%|50%|25%|100vw|100vh|0',
   'min-width,min-height,min-inline-size,min-block-size: 0|auto|fit-content|min-content|max-content|100%|100vw|100vh',
   'max-width,max-height,max-inline-size,max-block-size: none|fit-content|min-content|max-content|100%|100vw|100vh|1200px|65ch',
   'margin,margin-top,margin-right,margin-bottom,margin-left,margin-block,margin-inline: 0|auto|8px|16px|1rem|0 auto|1em 0',
   'padding,padding-top,padding-right,padding-bottom,padding-left,padding-block,padding-inline: 0|4px|8px|16px|24px|1rem|8px 16px',
   'top,right,bottom,left,inset,inset-block,inset-inline: auto|0|50%|100%|10px|-1px',
   'z-index: auto|0|1|2|10|100|999|-1',
   'font-size: xx-small|x-small|small|medium|large|x-large|xx-large|smaller|larger|12px|14px|16px|18px|24px|1rem|1.25rem|2em',
   'line-height: normal|1|1.2|1.4|1.5|1.6|2|24px',
   'letter-spacing,word-spacing: normal|0|0.05em|0.1em|1px|2px',
   'text-indent: 0|1em|2em|1rem',
   'text-shadow,box-shadow: none|0 1px 2px rgba(0,0,0,.2)|0 2px 8px rgba(0,0,0,.25)|0 10px 30px rgba(0,0,0,.3)|inset 0 1px 3px rgba(0,0,0,.3)',
   'color,background-color,border-color,outline-color,text-decoration-color,caret-color,accent-color,fill,stroke: currentcolor|transparent|black|white|red|blue|green|gray|#000000|#ffffff',
   'background: none|transparent|#ffffff|linear-gradient(90deg, #3b82f6, #8b5cf6)|radial-gradient(circle, #3b82f6, #1e293b)|url("") center / cover no-repeat',
   'background-image,mask-image,border-image: none|linear-gradient(180deg, #ffffff, #000000)|radial-gradient(circle, #ffffff, #000000)|url("")',
   'background-position,object-position,mask-position: center|top|bottom|left|right|top left|top right|bottom left|bottom right|0 0|50% 50%',
   'background-attachment: scroll|fixed|local',
   'background-clip,background-origin,mask-clip,mask-origin: border-box|padding-box|content-box|text',
   'border: none|1px solid currentcolor|1px solid #cccccc|2px solid #000000|1px dashed #cccccc|1px dotted #cccccc|medium none',
   'border-top,border-right,border-bottom,border-left,outline: none|1px solid currentcolor|2px solid #3b82f6|1px dashed #cccccc|medium none',
   'border-style,border-top-style,border-right-style,border-bottom-style,border-left-style,outline-style: none|hidden|solid|dashed|dotted|double|groove|ridge|inset|outset',
   'border-width,border-top-width,border-right-width,border-bottom-width,border-left-width,outline-width: thin|medium|thick|0|1px|2px|4px',
   'border-radius,border-top-left-radius,border-top-right-radius,border-bottom-left-radius,border-bottom-right-radius: 0|2px|4px|8px|12px|16px|50%|9999px|8px 8px 0 0',
   'border-collapse: collapse|separate','border-spacing: 0|2px|4px 8px','outline-offset: 0|2px|4px|-2px',
   'opacity: 0|0.25|0.5|0.75|1','pointer-events: auto|none|all|visiblePainted|painted|fill|stroke',
   'user-select,-webkit-user-select: auto|none|text|all|contain','resize: none|both|horizontal|vertical|block|inline',
   'object-fit: fill|contain|cover|none|scale-down','aspect-ratio: auto|1 / 1|16 / 9|4 / 3|3 / 2|21 / 9',
   'flex: none|auto|initial|1|1 1 0%|0 0 auto|1 1 auto|2','flex-grow,flex-shrink,order: 0|1|2|3|-1','flex-basis: auto|content|0|100%|50%|200px',
   'flex-flow: row nowrap|row wrap|column nowrap|column wrap',
   'gap,row-gap,column-gap,grid-gap: normal|0|4px|8px|16px|24px|1rem',
   'justify-items,justify-self,place-items,place-self: auto|normal|stretch|start|end|center|left|right|baseline|safe center',
   'align-content,place-content: normal|start|end|center|stretch|space-between|space-around|space-evenly|baseline',
   'grid-template-columns,grid-template-rows: none|auto|1fr|1fr 1fr|repeat(2, 1fr)|repeat(3, 1fr)|repeat(4, 1fr)|repeat(auto-fit, minmax(200px, 1fr))|repeat(auto-fill, minmax(200px, 1fr))|200px 1fr|subgrid',
   'grid-template-areas: none|"header header" "sidebar main"|"a b" "c d"',
   'grid-column,grid-row,grid-column-start,grid-column-end,grid-row-start,grid-row-end: auto|1|2|-1|1 / -1|span 2|span 3|1 / span 2',
   'grid-area: auto|header|main|sidebar|footer|1 / 1 / 2 / 3','grid-auto-columns,grid-auto-rows: auto|1fr|min-content|max-content|minmax(100px, auto)',
   'transform: none|rotate(45deg)|rotate(-5deg)|scale(1.05)|scale(0.95)|translateX(10px)|translateY(-4px)|translate(-50%, -50%)|skew(10deg)|perspective(600px) rotateY(20deg)',
   'transform-origin: center|top|bottom|left|right|top left|top right|bottom left|bottom right|50% 50%|0 0',
   'transform-style: flat|preserve-3d','backface-visibility: visible|hidden','perspective: none|400px|600px|800px|1000px|1200px','perspective-origin: center|50% 50%|top|bottom|left|right',
   'rotate: none|45deg|90deg|-45deg','scale: none|1.1|0.9|1.5|2','translate: none|10px 20px|50% 50%|0 -4px',
   'transition: none|all 0.2s ease|all 0.3s ease-in-out|opacity 0.3s ease|transform 0.3s ease|background-color 0.2s ease, color 0.2s ease',
   'transition-property: all|none|opacity|transform|color|background-color|width|height|box-shadow','transition-duration,transition-delay,animation-duration,animation-delay: 0s|0.1s|0.2s|0.3s|0.5s|1s|2s',
   'transition-timing-function,animation-timing-function: ease|linear|ease-in|ease-out|ease-in-out|step-start|step-end|steps(4)|cubic-bezier(0.4, 0, 0.2, 1)',
   'transition-behavior: normal|allow-discrete',
   'animation: none|spin 1s linear infinite|fade 0.3s ease-in|pulse 2s ease-in-out infinite',
   'animation-name: none|spin|fade|pulse|bounce','animation-iteration-count: 1|2|3|infinite','animation-direction: normal|reverse|alternate|alternate-reverse',
   'animation-fill-mode: none|forwards|backwards|both','animation-play-state: running|paused',
   'filter: none|blur(4px)|brightness(1.2)|contrast(1.2)|grayscale(1)|sepia(1)|saturate(1.5)|hue-rotate(90deg)|invert(1)|opacity(0.5)|drop-shadow(0 2px 4px rgba(0,0,0,.3))',
   'backdrop-filter,-webkit-backdrop-filter: none|blur(8px)|blur(12px) saturate(1.5)|brightness(0.8)',
   'clip-path: none|circle(50%)|ellipse(50% 40%)|inset(0 round 8px)|polygon(50% 0, 100% 100%, 0 100%)',
   'will-change: auto|transform|opacity|scroll-position|contents','contain: none|strict|content|size|layout|paint|style',
   'isolation: auto|isolate','content-visibility: visible|auto|hidden',
   'content: normal|none|""|"•"|attr(title)|counter(item)|open-quote|close-quote',
   'quotes: auto|none|"“" "”" "‘" "’"','counter-reset,counter-increment: none|item|item 1|section 0',
   'list-style: none|disc inside|decimal outside|square|circle',
   'list-style-type: none|disc|circle|square|decimal|decimal-leading-zero|lower-alpha|upper-alpha|lower-roman|upper-roman|lower-greek',
   'list-style-position: inside|outside','list-style-image: none|url("")',
   'table-layout: auto|fixed','caption-side: top|bottom','empty-cells: show|hide',
   'text-decoration-line: none|underline|overline|line-through|underline line-through',
   'text-decoration-style: solid|double|dotted|dashed|wavy','text-decoration-thickness: auto|from-font|1px|2px|0.1em',
   'text-underline-offset: auto|1px|2px|4px|0.2em','text-underline-position: auto|under|left|right',
   'text-overflow: clip|ellipsis','text-align-last: auto|start|end|left|right|center|justify',
   'text-justify: auto|inter-word|inter-character|none','text-orientation: mixed|upright|sideways',
   'vertical-align: baseline|top|middle|bottom|text-top|text-bottom|sub|super|0',
   'word-break: normal|break-all|keep-all|break-word','overflow-wrap,word-wrap: normal|anywhere|break-word',
   'hyphens: none|manual|auto','tab-size: 2|4|8','line-break: auto|loose|normal|strict|anywhere',
   'font-variant: normal|small-caps|all-small-caps|petite-caps|tabular-nums|oldstyle-nums','font-variant-numeric: normal|tabular-nums|lining-nums|oldstyle-nums|slashed-zero',
   'font-stretch: normal|condensed|expanded|75%|100%|125%','font-kerning: auto|normal|none','font-synthesis: weight style|none',
   'font-feature-settings: normal|"liga" 0|"tnum"|"smcp"','font-variation-settings: normal|"wght" 400|"wght" 700','font-optical-sizing: auto|none',
   'direction: ltr|rtl','unicode-bidi: normal|embed|isolate|bidi-override|isolate-override|plaintext',
   'writing-mode: horizontal-tb|vertical-rl|vertical-lr|sideways-rl|sideways-lr',
   'color-scheme: normal|light|dark|light dark','appearance,-webkit-appearance: none|auto|button|textfield|menulist',
   'scroll-behavior: auto|smooth','scroll-snap-type: none|x mandatory|y mandatory|both mandatory|x proximity|y proximity',
   'scroll-snap-align: none|start|center|end','scroll-snap-stop: normal|always',
   'scroll-margin,scroll-padding: 0|8px|16px|auto','overscroll-behavior,overscroll-behavior-x,overscroll-behavior-y: auto|contain|none',
   'overflow-x,overflow-y,overflow-block,overflow-inline: visible|hidden|auto|scroll|clip','overflow-anchor: auto|none','overflow-clip-margin: 0|4px|content-box',
   'scrollbar-width: auto|thin|none','scrollbar-gutter: auto|stable|stable both-edges','scrollbar-color: auto|#888 #eee|dark',
   'touch-action: auto|none|manipulation|pan-x|pan-y|pinch-zoom','container-type: normal|size|inline-size','container-name: none|card|sidebar','container: card / inline-size',
   'zoom: 1|0.5|0.75|1.25|1.5|2','all: initial|inherit|unset|revert|revert-layer',
   'box-decoration-break: slice|clone','break-before,break-after: auto|avoid|always|page|column','break-inside: auto|avoid|avoid-page|avoid-column',
   'orphans,widows: 1|2|3|4','column-count: auto|2|3|4','column-width: auto|200px|20em','columns: 2|3|auto 200px','column-fill: balance|auto','column-span: none|all',
   'column-rule,column-rule-width: none|1px solid #cccccc|thin|1px','column-rule-style: none|solid|dashed|dotted',
   'mask-repeat: repeat|no-repeat|space|round','mask-size: auto|cover|contain','mask-mode: match-source|alpha|luminance','mask-composite: add|subtract|intersect|exclude','mask-type: luminance|alpha',
   'mask: none|linear-gradient(#000, transparent)|url("") center / contain no-repeat',
   'image-rendering: auto|crisp-edges|pixelated|smooth|high-quality','image-orientation: from-image|none',
   'shape-outside: none|circle(50%)|margin-box|border-box|padding-box|content-box','shape-margin: 0|8px|16px','shape-image-threshold: 0|0.5|1',
   'offset-path: none|circle(50%)|path("M0 0 L100 100")','offset-distance: 0|50%|100%','offset-rotate: auto|0deg|reverse',
   'stroke-width,stroke-dashoffset,stroke-miterlimit: 0|1|2|4','stroke-dasharray: none|4|4 2|8 4','stroke-linecap: butt|round|square','stroke-linejoin: miter|round|bevel',
   'fill-opacity,stroke-opacity,stop-opacity,flood-opacity: 0|0.5|1','fill-rule,clip-rule: nonzero|evenodd',
   'paint-order: normal|stroke fill|stroke fill markers|markers','vector-effect: none|non-scaling-stroke','shape-rendering: auto|crispEdges|geometricPrecision|optimizeSpeed',
   'text-rendering: auto|optimizeSpeed|optimizeLegibility|geometricPrecision','dominant-baseline,alignment-baseline: auto|middle|hanging|central|text-top|text-bottom|alphabetic|mathematical',
   'text-anchor: start|middle|end','mix-blend-mode,background-blend-mode: normal|multiply|screen|overlay|darken|lighten|color-dodge|color-burn|hard-light|soft-light|difference|exclusion|hue|saturation|color|luminosity',
   'cursor: auto|default|pointer|text|move|not-allowed|grab|grabbing|help|wait|progress|crosshair|zoom-in|zoom-out|none',
   'visibility: visible|hidden|collapse','float: none|left|right|inline-start|inline-end','clear: none|left|right|both|inline-start|inline-end',
   'display: block|inline|inline-block|flex|inline-flex|grid|inline-grid|flow-root|contents|list-item|table|none',
   'position: static|relative|absolute|fixed|sticky','box-sizing: border-box|content-box',
   'flex-direction: row|row-reverse|column|column-reverse','flex-wrap: nowrap|wrap|wrap-reverse','justify-content,align-items,align-self: start|end|center|stretch|space-between|space-around|space-evenly|baseline',
   '-webkit-line-clamp,line-clamp: none|1|2|3|4|5','-webkit-box-orient: horizontal|vertical|inline-axis|block-axis',
   '-webkit-text-fill-color,-webkit-text-stroke-color: currentcolor|transparent|#000000|#ffffff','-webkit-text-stroke,-webkit-text-stroke-width: 1px|1px #000000|2px #ffffff|thin|medium',
   '-webkit-background-clip: border-box|padding-box|content-box|text','-webkit-tap-highlight-color: transparent|rgba(0,0,0,0)','-webkit-font-smoothing: auto|antialiased|subpixel-antialiased',
   '-webkit-text-security: none|disc|circle|square','-webkit-user-drag: auto|none|element',
   'field-sizing: fixed|content','interpolate-size: numeric-only|allow-keywords','view-transition-name: none|hero|header',
   'anchor-name: none|--anchor','position-anchor: auto|--anchor','position-area: top|bottom|left|right|top center|bottom center',
   'text-wrap-mode: wrap|nowrap','text-wrap-style: auto|balance|pretty|stable','hyphenate-character: auto|"-"','hanging-punctuation: none|first|last|force-end|allow-end',
   'print-color-adjust,color-adjust: economy|exact','forced-color-adjust: auto|none|preserve-parent-color','math-style: normal|compact','math-depth: 0|1|auto-add',
   'ruby-position: over|under|alternate','ruby-align: space-around|start|center|space-between','page: auto|left|right','page-orientation: upright|rotate-left|rotate-right'
  ];
  SPEC.forEach(function(line){
    var i=line.indexOf(': ');var names=line.slice(0,i).split(','),vals=line.slice(i+2).split('|');
    names.forEach(function(n){VALS[n]=(VALS[n]||[]).concat(vals);});
  });
})();
function valList(prop){
  var key=VALS[prop]?prop:'_',id='vl-'+key;
  if(!document.getElementById(id)){
    var dl=document.createElement('datalist');dl.id=id;
    var seen={};((VALS[prop]||[]).concat(GLOBALV)).forEach(function(v){if(seen[v])return;seen[v]=1;var o=document.createElement('option');o.value=v;dl.appendChild(o);});
    document.body.appendChild(dl);
  }
  return id;
}
SECTIONS.forEach(function(s){s.rows.forEach(function(r){r.forEach(function(f){if(f.p)KNOWN[f.p]=s.k;});});});
PHYS.forEach(function(p){KNOWN[p]='layout';});LOGI.forEach(function(p){KNOWN[p]='layout';});
['margin','padding'].forEach(function(b){SIDE.forEach(function(sd){KNOWN[b+'-'+sd]='box';});});
var CSSLIST=('-webkit-appearance -webkit-background-clip -webkit-box-orient -webkit-box-reflect -webkit-font-smoothing -webkit-line-clamp -webkit-tap-highlight-color -webkit-text-fill-color -webkit-text-security -webkit-text-stroke -webkit-text-stroke-color -webkit-text-stroke-width -webkit-user-drag accent-color additive-symbols align-content align-items align-self alignment-baseline all anchor-name anchor-scope animation animation-composition animation-delay animation-direction animation-duration animation-fill-mode animation-iteration-count animation-name animation-play-state animation-range animation-range-end animation-range-start animation-timeline animation-timing-function animation-trigger app-region appearance ascent-override aspect-ratio backdrop-filter backface-visibility background background-attachment background-blend-mode background-clip background-color background-image background-origin background-position background-position-x background-position-y background-repeat background-size base-palette baseline-shift baseline-source block-size border border-block border-block-color border-block-end border-block-end-color border-block-end-style border-block-end-width border-block-start border-block-start-color border-block-start-style border-block-start-width border-block-style border-block-width border-bottom border-bottom-color border-bottom-left-radius border-bottom-right-radius border-bottom-style border-bottom-width border-collapse border-color border-end-end-radius border-end-start-radius border-image border-image-outset border-image-repeat border-image-slice border-image-source border-image-width border-inline border-inline-color border-inline-end border-inline-end-color border-inline-end-style border-inline-end-width border-inline-start border-inline-start-color border-inline-start-style border-inline-start-width border-inline-style border-inline-width border-left border-left-color border-left-style border-left-width border-radius border-right border-right-color border-right-style border-right-width border-shape border-spacing border-start-end-radius border-start-start-radius border-style border-top border-top-color border-top-left-radius border-top-right-radius border-top-style border-top-width border-width bottom box-decoration-break box-shadow box-sizing break-after break-before break-inside buffered-rendering caption-side caret-animation caret-color caret-shape clear clip clip-path clip-rule color color-interpolation color-interpolation-filters color-rendering color-scheme column-count column-fill column-gap column-height column-rule column-rule-break column-rule-color column-rule-inset column-rule-inset-cap column-rule-inset-cap-end column-rule-inset-cap-start column-rule-inset-end column-rule-inset-junction column-rule-inset-junction-end column-rule-inset-junction-start column-rule-inset-start column-rule-style column-rule-visibility-items column-rule-width column-span column-width column-wrap columns contain contain-intrinsic-block-size contain-intrinsic-height contain-intrinsic-inline-size contain-intrinsic-size contain-intrinsic-width container container-name container-type content content-visibility corner-block-end-shape corner-block-start-shape corner-bottom-left-shape corner-bottom-right-shape corner-bottom-shape corner-end-end-shape corner-end-start-shape corner-inline-end-shape corner-inline-start-shape corner-left-shape corner-right-shape corner-shape corner-start-end-shape corner-start-start-shape corner-top-left-shape corner-top-right-shape corner-top-shape counter-increment counter-reset counter-set cursor cx cy d descent-override direction display dominant-baseline dynamic-range-limit empty-cells fallback field-sizing fill fill-opacity fill-rule filter flex flex-basis flex-direction flex-flow flex-grow flex-line-count flex-shrink flex-wrap float flood-color flood-opacity font font-display font-family font-feature-settings font-kerning font-language-override font-optical-sizing font-palette font-size font-size-adjust font-stretch font-style font-synthesis font-synthesis-small-caps font-synthesis-style font-synthesis-weight font-variant font-variant-alternates font-variant-caps font-variant-east-asian font-variant-emoji font-variant-ligatures font-variant-numeric font-variant-position font-variation-settings font-weight forced-color-adjust gap grid grid-area grid-auto-columns grid-auto-flow grid-auto-rows grid-column grid-column-end grid-column-gap grid-column-start grid-gap grid-row grid-row-end grid-row-gap grid-row-start grid-template grid-template-areas grid-template-columns grid-template-rows height hyphenate-character hyphenate-limit-chars hyphens image-orientation image-rendering inherits initial-letter initial-value inline-size inset inset-block inset-block-end inset-block-start inset-inline inset-inline-end inset-inline-start interactivity interest-delay interest-delay-end interest-delay-start interpolate-size isolation justify-content justify-items justify-self left letter-spacing lighting-color line-break line-gap-override line-height list-style list-style-image list-style-position list-style-type margin margin-block margin-block-end margin-block-start margin-bottom margin-inline margin-inline-end margin-inline-start margin-left margin-right margin-top marker marker-end marker-mid marker-start mask mask-clip mask-composite mask-image mask-mode mask-origin mask-position mask-repeat mask-size mask-type math-depth math-shift math-style max-block-size max-height max-inline-size max-width min-block-size min-height min-inline-size min-width mix-blend-mode navigation negative object-fit object-position object-view-box offset offset-anchor offset-distance offset-path offset-position offset-rotate opacity order orphans outline outline-color outline-offset outline-style outline-width overflow overflow-anchor overflow-block overflow-clip-margin overflow-inline overflow-wrap overflow-x overflow-y overlay override-colors overscroll-behavior overscroll-behavior-block overscroll-behavior-inline overscroll-behavior-x overscroll-behavior-y pad padding padding-block padding-block-end padding-block-start padding-bottom padding-inline padding-inline-end padding-inline-start padding-left padding-right padding-top page page-break-after page-break-before page-break-inside page-margin-safety page-orientation paint-order perspective perspective-origin place-content place-items place-self pointer-events position position-anchor position-area position-try position-try-fallbacks position-try-order position-visibility prefix print-color-adjust quotes r range reading-flow reading-order resize result right rotate row-gap row-rule row-rule-break row-rule-color row-rule-inset row-rule-inset-cap row-rule-inset-cap-end row-rule-inset-cap-start row-rule-inset-end row-rule-inset-junction row-rule-inset-junction-end row-rule-inset-junction-start row-rule-inset-start row-rule-style row-rule-visibility-items row-rule-width ruby-align ruby-overhang ruby-position rule rule-break rule-color rule-inset rule-inset-cap rule-inset-end rule-inset-junction rule-inset-start rule-overlap rule-style rule-visibility-items rule-width rx ry scale scroll-axis-lock scroll-behavior scroll-initial-target scroll-margin scroll-margin-block scroll-margin-block-end scroll-margin-block-start scroll-margin-bottom scroll-margin-inline scroll-margin-inline-end scroll-margin-inline-start scroll-margin-left scroll-margin-right scroll-margin-top scroll-marker-group scroll-padding scroll-padding-block scroll-padding-block-end scroll-padding-block-start scroll-padding-bottom scroll-padding-inline scroll-padding-inline-end scroll-padding-inline-start scroll-padding-left scroll-padding-right scroll-padding-top scroll-snap-align scroll-snap-stop scroll-snap-type scroll-target-group scroll-timeline scroll-timeline-axis scroll-timeline-name scrollbar-color scrollbar-gutter scrollbar-width shape-image-threshold shape-margin shape-outside shape-rendering size size-adjust speak speak-as src stop-color stop-opacity stroke stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit stroke-opacity stroke-width suffix symbols syntax system tab-size table-layout text-align text-align-last text-anchor text-autospace text-box text-box-edge text-box-trim text-combine-upright text-decoration text-decoration-color text-decoration-line text-decoration-skip-ink text-decoration-style text-decoration-thickness text-emphasis text-emphasis-color text-emphasis-position text-emphasis-style text-fit text-indent text-justify text-orientation text-overflow text-rendering text-shadow text-size-adjust text-spacing-trim text-transform text-underline-offset text-underline-position text-wrap text-wrap-mode text-wrap-style timeline-scope timeline-trigger timeline-trigger-activation-range timeline-trigger-activation-range-end timeline-trigger-activation-range-start timeline-trigger-active-range timeline-trigger-active-range-end timeline-trigger-active-range-start timeline-trigger-name timeline-trigger-source top touch-action transform transform-box transform-origin transform-style transition transition-behavior transition-delay transition-duration transition-property transition-timing-function translate trigger-scope types unicode-bidi unicode-range user-select vector-effect vertical-align view-timeline view-timeline-axis view-timeline-inset view-timeline-name view-transition-class view-transition-group view-transition-name view-transition-scope visibility white-space white-space-collapse widows width will-change window-drag word-break word-spacing word-wrap writing-mode x y z-index zoom').split(' ');

/* ---------- history ---------- */
function snap(){return JSON.stringify({root:S.root,css:S.css,js:S.js,title:S.title});}
function commit(){var s=snap();if(s===hist[hi])return;S.dirty=true;hist=hist.slice(0,hi+1);hist.push(s);if(hist.length>120)hist.shift();hi=hist.length-1;save();syncUndo();}
function save(){try{localStorage.setItem(KEY,snap());}catch(e){}if(D)D.setDocName((S.file||S.title)+(S.dirty?' *':''));}
function syncUndo(){$('#btnUndo').disabled=hi<=0;$('#btnRedo').disabled=hi>=hist.length-1;}
function restore(s){var o=JSON.parse(s);S.root=o.root;S.css=o.css;S.js=o.js;S.title=o.title||S.title;if(!find(S.sel))S.sel=S.root.id;$('#projName').value=S.title;fixUid();renderAll();}
function undo(){if(hi>0){hi--;restore(hist[hi]);save();syncUndo();}}
function redo(){if(hi<hist.length-1){hi++;restore(hist[hi]);save();syncUndo();}}
function loadState(st){S.root=st.root;S.css=st.css||'';S.js=st.js||'';S.title=st.title||'untitled-page';S.sel=S.root.id;S.collapsed={};S.pending={};fixUid();$('#projName').value=S.title;hist=[];hi=-1;commit();renderAll();}
function changed(){commit();renderAll();}

/* ---------- canvas rendering ---------- */
var page=$('#page'),frame=$('#frame'),stage=$('#stage'),inner=$('#inner'),ov=$('#ov');
function build(n){
  if(BLOCKED_TAGS[n.tag.toLowerCase()])return document.createComment('blocked');
  var el=n.ns?document.createElementNS(SVGNS,n.tag):document.createElement(n.tag);
  el.setAttribute('data-nid',n.id);
  Object.keys(n.attrs).forEach(function(k){if(/^on/i.test(k)||k==='id'||k==='contenteditable'||!k)return;try{el.setAttribute(k,n.attrs[k]);}catch(e){}});
  Object.keys(n.style).forEach(function(p){el.style.setProperty(p,n.style[p]);});
  if(n.text)el.appendChild(document.createTextNode(n.text));
  n.children.forEach(function(c){el.appendChild(build(c));});
  return el;
}
function renderCanvas(){
  while(page.firstChild)page.removeChild(page.firstChild);
  page.removeAttribute('style');
  Object.keys(S.root.style).forEach(function(p){page.style.setProperty(p,S.root.style[p]);});
  page.style.width=S.dw+'px';page.style.minHeight=S.dh+'px';page.style.transform='scale('+S.zoom+')';
  page.setAttribute('data-nid',S.root.id);
  var sty=document.createElement('style');sty.textContent=S.css;page.appendChild(sty);
  S.root.children.forEach(function(c){page.appendChild(build(c));});
  sizeFrame();
}
function sizeFrame(){frame.style.width=(S.dw*S.zoom)+'px';frame.style.height=(page.offsetHeight*S.zoom)+'px';}
function elOf(id){if(id===S.root.id)return page;return page.querySelector('[data-nid="'+id+'"]');}

function placeOverlay(){
  var f=find(S.sel),el=f&&elOf(S.sel);
  if(!el||S.view!=='canvas'){ov.hidden=true;return;}
  var r=el.getBoundingClientRect(),b=inner.getBoundingClientRect();
  ov.hidden=false;ov.style.left=(r.left-b.left)+'px';ov.style.top=(r.top-b.top)+'px';ov.style.width=r.width+'px';ov.style.height=r.height+'px';
  ov.classList.toggle('isroot',S.sel===S.root.id);
  var n=f.node;
  $('#ovLab').textContent=(n.tag==='body'?'body':n.tag)+(n.attrs.id?'#'+n.attrs.id:'');
  $('#ovSz').textContent=Math.round(r.width/S.zoom)+' × '+Math.round(r.height/S.zoom);
  updateRuler(el);
}
function updateRuler(el){
  el=el||elOf(S.sel);if(!el)return;
  var r=el.getBoundingClientRect(),p=page.getBoundingClientRect(),z=S.zoom;
  $('#rpos').innerHTML='X: <strong>'+Math.round((r.left-p.left)/z)+'px</strong> &nbsp;Y: <strong>'+Math.round((r.top-p.top)/z)+'px</strong> &nbsp;W: <strong>'+Math.round(r.width/z)+'px</strong> &nbsp;H: <strong>'+Math.round(r.height/z)+'px</strong>';
}

/* ---------- selection and editing on the canvas ---------- */
stage.addEventListener('mousedown',function(e){
  if(e.target.closest('.sel')||e.target.closest('[contenteditable="true"]'))return;
  var t=e.target.closest('[data-nid]');
  if(t&&page.contains(t)){e.preventDefault();selectNode(t.getAttribute('data-nid'));}
},true);
page.addEventListener('click',function(e){if(!e.target.closest('[contenteditable="true"]'))e.preventDefault();},true);
page.addEventListener('submit',function(e){e.preventDefault();},true);
page.addEventListener('dblclick',function(e){var t=e.target.closest('[data-nid]');if(t)startEdit(t.getAttribute('data-nid'));});
function startEdit(id){
  var f=find(id),el=elOf(id);if(!f||!el||id===S.root.id)return;
  var n=f.node;if(n.children.length||VOID[n.tag]||n.ns)return;
  el.contentEditable='true';el.focus();
  var rg=document.createRange();rg.selectNodeContents(el);var sl=window.getSelection();sl.removeAllRanges();sl.addRange(rg);
  function done(){el.removeEventListener('keydown',kd);el.contentEditable='false';var v=el.textContent;if(v!==n.text){n.text=v;changed();}else renderAll();}
  function kd(ev){if(ev.key==='Escape'||(ev.key==='Enter'&&!ev.shiftKey&&n.tag!=='p'&&n.tag!=='textarea')){ev.preventDefault();el.blur();}ev.stopPropagation();}
  el.addEventListener('keydown',kd);el.addEventListener('blur',done,{once:true});
}
function selectNode(id){
  S.sel=id;S.pending={};
  var p=pathTo(id);p.slice(0,-1).forEach(function(n){delete S.collapsed[n.id];});
  renderLayers();renderProps();placeOverlay();renderCrumbs();
  var row=$('.lrow.on');if(row&&row.scrollIntoView)row.scrollIntoView({block:'nearest'});
}

/* resize handles */
Array.prototype.forEach.call(ov.querySelectorAll('.h'),function(h){
  h.addEventListener('pointerdown',function(e){
    e.preventDefault();e.stopPropagation();
    var el=elOf(S.sel);if(!el)return;var r=el.getBoundingClientRect();var dir=h.getAttribute('data-dir');
    var sx=e.clientX,sy=e.clientY,w0=r.width/S.zoom,h0=r.height/S.zoom,moved=false;
    try{h.setPointerCapture(e.pointerId);}catch(x){}
    function mv(ev){moved=true;
      if(dir.indexOf('e')>=0)setStyle('width',Math.max(8,Math.round(w0+(ev.clientX-sx)/S.zoom))+'px');
      if(dir.indexOf('s')>=0)setStyle('height',Math.max(8,Math.round(h0+(ev.clientY-sy)/S.zoom))+'px');}
    function up(){h.removeEventListener('pointermove',mv);h.removeEventListener('pointerup',up);if(moved){commit();renderProps();renderCodeIfOpen();}}
    h.addEventListener('pointermove',mv);h.addEventListener('pointerup',up);
  });
});

/* drag from palette onto the canvas */
var lastDrop=null;
function clearDrop(){if(lastDrop){lastDrop.classList.remove('nx-drop');lastDrop=null;}}
page.addEventListener('dragover',function(e){
  if(!hasType(e,'text/x-nx-tag'))return;e.preventDefault();
  var t=e.target.closest('[data-nid]');if(!t)return;if(t!==lastDrop){clearDrop();lastDrop=t;t.classList.add('nx-drop');}
});
page.addEventListener('dragleave',function(e){if(!page.contains(e.relatedTarget))clearDrop();});
page.addEventListener('drop',function(e){
  var tag=e.dataTransfer.getData('text/x-nx-tag');if(!tag)return;e.preventDefault();
  var t=e.target.closest('[data-nid]');clearDrop();addByTag(tag,t?t.getAttribute('data-nid'):S.root.id);
});
function hasType(e,t){var ty=e.dataTransfer&&e.dataTransfer.types;if(!ty)return false;for(var i=0;i<ty.length;i++)if(ty[i]===t)return true;return false;}

/* ---------- tree operations ---------- */
function insertNode(n,targetId,zone){
  var f=find(targetId||S.root.id);if(!f)f=find(S.root.id);
  var tn=f.node;
  if(!zone)zone=CONT[tn.tag]?'inside':'after';
  if(tn.id===S.root.id)zone='inside';
  if(zone==='inside'){tn.children.push(n);}
  else{var i=f.index+(zone==='after'?1:0);f.parent.children.splice(i,0,n);}
}
function addByTag(tag,targetId){
  var n=make(tag);insertNode(n,targetId||S.sel);
  S.sel=(tag!=='svg'&&n.tag==='svg'&&n.children[0])?n.children[0].id:n.id;
  changed();selectNode(S.sel);toast('Added <'+tag+'>');
}
function dupSel(){var f=find(S.sel);if(!f||!f.parent)return;var c=clone(f.node);f.parent.children.splice(f.index+1,0,c);S.sel=c.id;changed();}
function delSel(){var f=find(S.sel);if(!f||!f.parent)return;S.sel=f.parent.id;f.parent.children.splice(f.index,1);changed();}
function moveSel(d){var f=find(S.sel);if(!f||!f.parent)return;var j=f.index+d;if(j<0||j>=f.parent.children.length)return;var a=f.parent.children;a.splice(f.index,1);a.splice(j,0,f.node);changed();}
function moveNode(id,targetId,zone){
  if(id===targetId||id===S.root.id)return;var f=find(id);if(!f||contains(f.node,targetId))return;
  f.parent.children.splice(f.index,1);insertNode(f.node,targetId,zone);S.sel=id;changed();
}

/* ---------- palette + layers ---------- */
function renderPalette(){
  var q=$('#elSearch').value.trim().toLowerCase(),box=$('#palette');box.innerHTML='';
  PAL.forEach(function(g){
    var items=g.i.filter(function(it){return !q||it[0].indexOf(q)>=0||it[1].toLowerCase().indexOf(q)>=0;});if(!items.length)return;
    var d=document.createElement('details');d.className='grp';d.open=!!q||g.g==='Layout'||g.g==='Text'||g.g==='Links & Buttons';
    d.innerHTML='<summary><span>'+esc(g.g)+'</span><span class="cnt">'+items.length+'</span></summary>';
    var w=document.createElement('div');w.className='items';
    items.forEach(function(it){
      var b=document.createElement('button');b.className='it';b.draggable=true;b.type='button';b.title='Click to add, or drag onto the canvas';
      b.innerHTML='<b class="'+g.c+'">'+esc(g.b[it[0]]||it[0])+'</b><span><em>'+esc(it[0])+'</em><small>'+esc(it[1])+'</small></span>';
      b.addEventListener('click',function(){addByTag(it[0],S.sel);});
      b.addEventListener('dragstart',function(e){e.dataTransfer.setData('text/x-nx-tag',it[0]);e.dataTransfer.effectAllowed='copy';});
      w.appendChild(b);
    });
    d.appendChild(w);box.appendChild(d);
  });
}
function renderLayers(){
  var box=$('#layers');box.innerHTML='';var count=0;
  (function rec(n,depth){
    count++;
    var row=document.createElement('div');row.className='lrow'+(n.id===S.sel?' on':'');row.style.paddingLeft=(6+depth*14)+'px';row.setAttribute('data-id',n.id);
    var has=n.children.length>0,car=document.createElement('span');car.className='car';car.textContent=has?(S.collapsed[n.id]?'▶':'▼'):'•';
    car.addEventListener('click',function(e){e.stopPropagation();if(has){S.collapsed[n.id]=!S.collapsed[n.id];if(!S.collapsed[n.id])delete S.collapsed[n.id];renderLayers();}});
    var bd=document.createElement('span');bd.className='bd';bd.textContent=n.tag==='body'?'B':n.tag.length<=3?n.tag.toUpperCase():n.tag.charAt(0).toUpperCase();
    var nm=document.createElement('span');nm.className='nm';nm.textContent=n.tag;
    var sub=document.createElement('span');sub.className='sub';
    sub.textContent=n.attrs.id?'#'+n.attrs.id:(n.attrs.class?'.'+n.attrs.class.split(/\s+/)[0]:(n.text?'“'+n.text.slice(0,16)+(n.text.length>16?'…':'')+'”':''));
    row.appendChild(car);row.appendChild(bd);row.appendChild(nm);row.appendChild(sub);
    row.addEventListener('click',function(){selectNode(n.id);});
    if(n.id!==S.root.id){row.draggable=true;row.addEventListener('dragstart',function(e){dragId=n.id;e.dataTransfer.setData('text/x-nx-move',n.id);e.dataTransfer.effectAllowed='move';});
      row.addEventListener('dragend',function(){dragId=null;clearRows();});}
    row.addEventListener('dragover',function(e){
      var mv=hasType(e,'text/x-nx-move'),tg=hasType(e,'text/x-nx-tag');if(!mv&&!tg)return;
      if(mv&&(dragId===n.id||(dragId&&contains(find(dragId).node,n.id))))return;
      e.preventDefault();clearRows();row.classList.add('drop-'+zoneOf(e,row,n));
    });
    row.addEventListener('dragleave',function(){row.classList.remove('drop-before','drop-after','drop-inside');});
    row.addEventListener('drop',function(e){
      e.preventDefault();var z=zoneOf(e,row,n);clearRows();
      var tag=e.dataTransfer.getData('text/x-nx-tag');
      if(tag){var nn=make(tag);insertNode(nn,n.id,z);S.sel=(tag!=='svg'&&nn.tag==='svg'&&nn.children[0])?nn.children[0].id:nn.id;changed();return;}
      var id=e.dataTransfer.getData('text/x-nx-move')||dragId;if(id)moveNode(id,n.id,z);
    });
    box.appendChild(row);
    if(has&&!S.collapsed[n.id])n.children.forEach(function(c){rec(c,depth+1);});
  })(S.root,0);
  $('#nodeCount').textContent='tree: '+count;
}
function zoneOf(e,row,n){
  if(n.id===S.root.id)return 'inside';var r=row.getBoundingClientRect(),y=(e.clientY-r.top)/r.height;
  if(y<0.28)return 'before';if(y>0.72)return 'after';return CONT[n.tag]?'inside':(y<0.5?'before':'after');
}
function clearRows(){Array.prototype.forEach.call(document.querySelectorAll('.lrow'),function(r){r.classList.remove('drop-before','drop-after','drop-inside');});}

/* ---------- inspector ---------- */
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function escA(s){return esc(s).replace(/"/g,'&quot;');}
function setStyle(p,v){
  var f=find(S.sel);if(!f)return;
  if(v===''||v==null)delete f.node.style[p];else f.node.style[p]=v;
  var el=elOf(S.sel);if(el){if(v===''||v==null)el.style.removeProperty(p);else el.style.setProperty(p,v);}
  if(S.sel===S.root.id){page.style.width=S.dw+'px';page.style.minHeight=S.dh+'px';page.style.transform='scale('+S.zoom+')';}
  sizeFrame();placeOverlay();save();
}
function toHex(v){var t=document.createElement('span');t.style.color=v||'#000';document.body.appendChild(t);var c=getComputedStyle(t).color;document.body.removeChild(t);
  var m=c.match(/\d+(\.\d+)?/g)||[0,0,0];return '#'+[0,1,2].map(function(i){return ('0'+Math.round(+m[i]).toString(16)).slice(-2);}).join('');}
function mkField(f,n,secKey){
  var w=document.createElement('div');w.className='fld';
  var id='f-'+f.p,val=n.style[f.p]||'',inp,el=elOf(S.sel);
  var lab=document.createElement('label');lab.htmlFor=id;lab.textContent=f.l||f.p;w.appendChild(lab);
  function live(v){
    if(f.p==='margin'||f.p==='padding'){var nn=find(S.sel);if(nn)SIDE.forEach(function(sd){if(nn.node.style[f.p+'-'+sd])setStyle(f.p+'-'+sd,'');});}
    setStyle(f.p,v);
    if(f.p==='margin'||f.p==='padding')refreshSides(f.p,v);
  }
  if(f.t==='select'){
    inp=document.createElement('select');inp.id=id;
    var opts=['']; f.o.forEach(function(o){opts.push(o);}); if(val&&opts.indexOf(val)<0)opts.push(val);
    opts.forEach(function(o){var op=document.createElement('option');op.value=o;op.textContent=o===''?'—':o;inp.appendChild(op);});
    inp.value=val;inp.addEventListener('change',function(){live(inp.value);commit();renderCodeIfOpen();});w.appendChild(inp);
  }else if(f.t==='align'){
    var sg=document.createElement('div');sg.className='seg';
    [['left','⇤'],['center','≡'],['right','⇥'],['justify','☰']].forEach(function(a){var b=document.createElement('button');b.type='button';b.textContent=a[1];b.title=a[0];b.setAttribute('aria-label','Align '+a[0]);if(val===a[0])b.className='on';
      b.addEventListener('click',function(){live(val===a[0]?'':a[0]);commit();renderProps();renderCodeIfOpen();});sg.appendChild(b);});
    w.appendChild(sg);
  }else if(f.t==='color'){
    var cw=document.createElement('div');cw.className='colr';
    var sw=document.createElement('input');sw.type='color';sw.setAttribute('aria-label',f.p+' picker');sw.value=toHex(val||(el?getComputedStyle(el)[camel(f.p)]:'#000'));
    inp=document.createElement('input');inp.type='text';inp.id=id;inp.value=val;inp.placeholder=el?getComputedStyle(el)[camel(f.p)]:'';inp.setAttribute('list',valList(f.p));
    sw.addEventListener('input',function(){inp.value=sw.value;live(sw.value);});sw.addEventListener('change',function(){commit();renderCodeIfOpen();});
    inp.addEventListener('input',function(){live(inp.value);});inp.addEventListener('change',function(){commit();renderCodeIfOpen();});
    cw.appendChild(sw);cw.appendChild(inp);w.appendChild(cw);
  }else if(f.t==='range'){
    var rg=document.createElement('div');rg.className='rng';
    inp=document.createElement('input');inp.type='range';inp.min=0;inp.max=100;inp.id=id;inp.value=val===''?100:Math.round(parseFloat(val)*100);
    var out=document.createElement('output');out.textContent=inp.value+'%';
    inp.addEventListener('input',function(){out.textContent=inp.value+'%';live(+inp.value===100?'':String(inp.value/100));});
    inp.addEventListener('change',function(){commit();renderCodeIfOpen();});
    rg.appendChild(inp);rg.appendChild(out);w.appendChild(rg);
  }else{
    inp=document.createElement('input');inp.type='text';inp.id=id;inp.value=val;inp.autocomplete='off';inp.spellcheck=false;inp.setAttribute('list',valList(f.p));
    if(el&&f.p.indexOf('-')>=0||el){try{var cv=getComputedStyle(el).getPropertyValue(f.p);if(cv&&cv.length<28)inp.placeholder=cv;}catch(e){}}
    inp.addEventListener('input',function(){live(inp.value);});inp.addEventListener('change',function(){commit();renderCodeIfOpen();});
    w.appendChild(inp);
  }
  return w;
}
function camel(p){return p.replace(/-([a-z])/g,function(m,c){return c.toUpperCase();});}
function row(fields,cls){var r=document.createElement('div');r.className='row c'+(cls||fields.length);fields.forEach(function(f){r.appendChild(f);});return r;}
function boxModel(el){
  var d=document.createElement('div');d.className='bm';if(!el){return d;}
  var cs=getComputedStyle(el),px=function(p){return parseFloat(cs[p])||0;};
  var z=1;
  d.innerHTML='<span class="l">margin</span><div>'+Math.round(px('marginTop'))+'</div><div class="mid"><span>'+Math.round(px('marginLeft'))+'</span><div class="bo"><span class="l">border '+Math.round(px('borderTopWidth'))+'</span>'+
    '<div class="pa"><span class="l">padding '+Math.round(px('paddingTop'))+' '+Math.round(px('paddingRight'))+' '+Math.round(px('paddingBottom'))+' '+Math.round(px('paddingLeft'))+'</span><div class="ct">'+Math.round(el.offsetWidth*z)+' × '+Math.round(el.offsetHeight*z)+'</div></div></div><span>'+Math.round(px('marginRight'))+'</span></div><div>'+Math.round(px('marginBottom'))+'</div>';
  return d;
}
/* margin / padding: one field per side (top, right, bottom, left), kept in step with the shorthand field above them */
function splitVals(v){
  var out=[],cur='',d=0;
  for(var i=0;i<v.length;i++){var c=v.charAt(i);if(c==='(')d++;if(c===')')d--;
    if(/\s/.test(c)&&d===0){if(cur){out.push(cur);cur='';}}else cur+=c;}
  if(cur)out.push(cur);return out;
}
function expand4(v){
  var a=splitVals(v||'');if(!a.length||a.length>4)return null;
  if(a.length===1)return [a[0],a[0],a[0],a[0]];
  if(a.length===2)return [a[0],a[1],a[0],a[1]];
  if(a.length===3)return [a[0],a[1],a[2],a[1]];
  return a;
}
function sideVals(n,prop){
  var base=expand4(n.style[prop]);
  return SIDE.map(function(sd,i){var lh=n.style[prop+'-'+sd];if(lh)return lh;return base?base[i]:'';});
}
function refreshSides(prop,v){
  var e=expand4(v);
  SIDE.forEach(function(sd,i){var inp=document.getElementById('f-'+prop+'-'+sd);if(inp&&document.activeElement!==inp)inp.value=e?e[i]:'';});
}
function writeSide(prop,i,val){
  var f=find(S.sel);if(!f)return;var n=f.node,el=elOf(S.sel),cs=el?getComputedStyle(el):null;
  var cur=sideVals(n,prop);
  var nx=SIDE.map(function(sd,k){var v=k===i?val.trim():cur[k];if(!v)v=cs?cs[camel(prop+'-'+sd)]:'0';return v;});
  var T=nx[0],R=nx[1],B=nx[2],L=nx[3],out;
  if(T===R&&R===B&&B===L)out=T;else if(T===B&&R===L)out=T+' '+R;else if(R===L)out=T+' '+R+' '+B;else out=nx.join(' ');
  SIDE.forEach(function(sd){if(n.style[prop+'-'+sd])setStyle(prop+'-'+sd,'');});
  setStyle(prop,out);
  var sh=document.getElementById('f-'+prop);if(sh)sh.value=out;
  SIDE.forEach(function(sd,k){if(k===i)return;var inp=document.getElementById('f-'+prop+'-'+sd);if(inp)inp.value=nx[k];});
}
function sidesBlock(n,prop,el){
  var w=document.createElement('div');
  var h=document.createElement('span');h.className='lbl';h.textContent=cap(prop)+' per side (T · R · B · L)';w.appendChild(h);
  var r=document.createElement('div');r.className='row c4';
  var cs=el?getComputedStyle(el):null,vals=sideVals(n,prop);
  SIDE.forEach(function(sd,i){
    var pp=prop+'-'+sd,inp=document.createElement('input');
    inp.type='text';inp.className='inp';inp.id='f-'+pp;inp.value=vals[i];inp.placeholder=cs?cs[camel(pp)]:'0';inp.title=pp;inp.setAttribute('aria-label',pp);inp.setAttribute('list',valList(pp));inp.autocomplete='off';inp.spellcheck=false;inp.style.textAlign='center';
    inp.addEventListener('input',function(){writeSide(prop,i,inp.value);});
    inp.addEventListener('change',function(){commit();renderCodeIfOpen();});
    r.appendChild(inp);
  });
  w.appendChild(r);return w;
}
function secCount(n,key){var c=0;Object.keys(n.style).forEach(function(p){if(KNOWN[p]===key)c++;});return c;}
function renderProps(){
  var f=find(S.sel);if(!f)return;var n=f.node,box=$('#propBody');box.innerHTML='';
  $('#pTitle').textContent='(<'+n.tag+(n.attrs.id?'#'+n.attrs.id:'')+'>)';
  ['rtHtml','rtCss','rtJs'].forEach(function(t){$('#'+t).classList.toggle('on',t==='rt'+cap(S.rtab));});
  $('#addbar').style.display=S.rtab==='css'?'':'none';
  if(S.rtab==='html')return renderHtmlTab(n,box);
  if(S.rtab==='js')return renderJsTab(n,box);
  var el=elOf(S.sel);
  SECTIONS.forEach(function(s){
    var d=document.createElement('details');d.className='sec';d.open=!!S.open[s.k];
    d.addEventListener('toggle',function(){if(d.open)S.open[s.k]=1;else delete S.open[s.k];});
    var cnt=secCount(n,s.k),h='';try{h=s.hint(n,el);}catch(e){}
    d.innerHTML='<summary><span>'+esc(s.name)+'</span><span class="cnt">'+(cnt?cnt+' set':esc(h))+'</span></summary>';
    var b=document.createElement('div');b.className='body';
    s.rows.forEach(function(r){
      if(r[0]==='BOXMODEL'){b.appendChild(boxModel(el));return;}
      if(r[0]==='INSETS'){b.appendChild(insetBlock(n));return;}
      if(r[0]==='SIDES'){b.appendChild(sidesBlock(n,r[1],el));return;}
      b.appendChild(row(r.map(function(x){return mkField(x,n,s.k);})));
    });
    d.appendChild(b);box.appendChild(d);
  });
  var extra=Object.keys(n.style).filter(function(p){return !KNOWN[p];});
  Object.keys(S.pending).forEach(function(p){if(extra.indexOf(p)<0&&!KNOWN[p])extra.push(p);});
  if(extra.length){
    var d2=document.createElement('details');d2.className='sec';d2.open=true;
    d2.innerHTML='<summary><span>Custom properties</span><span class="cnt">'+extra.length+'</span></summary>';
    var b2=document.createElement('div');b2.className='body';
    extra.forEach(function(p){
      var c=document.createElement('div');c.className='cust';c.innerHTML='<code title="'+escA(p)+'">'+esc(p)+'</code>';
      var i=document.createElement('input');i.type='text';i.className='inp';i.id='f-'+p;i.value=n.style[p]||'';i.setAttribute('aria-label',p);i.setAttribute('list',valList(p));
      i.addEventListener('input',function(){setStyle(p,i.value);});i.addEventListener('change',function(){commit();renderCodeIfOpen();});
      var x=document.createElement('button');x.type='button';x.textContent='×';x.title='Remove';x.setAttribute('aria-label','Remove '+p);
      x.addEventListener('click',function(){delete S.pending[p];setStyle(p,'');commit();renderProps();renderCodeIfOpen();});
      c.appendChild(i);c.appendChild(x);b2.appendChild(c);
    });
    d2.appendChild(b2);box.appendChild(d2);
  }
}
function cap(s){return s.charAt(0).toUpperCase()+s.slice(1);}
function insetBlock(n){
  var w=document.createElement('div');
  var h=document.createElement('div');h.style.cssText='display:flex;justify-content:space-between;align-items:center;margin-bottom:3px';
  h.innerHTML='<span class="lbl" style="margin:0">Inset coordinates (T · R · B · L)</span>';
  var tb=document.createElement('button');tb.type='button';tb.className='sbtn';tb.style.cssText='font:9px var(--mono);padding:1px 6px';tb.textContent=S.logical?'⇄ Hide logical':'⇄ Logical';
  tb.addEventListener('click',function(){S.logical=!S.logical;renderProps();});h.appendChild(tb);w.appendChild(h);
  var r=document.createElement('div');r.className='row c4';
  PHYS.forEach(function(p){var i=document.createElement('input');i.type='text';i.className='inp';i.id='f-'+p;i.value=n.style[p]||'';i.placeholder='auto';i.title=p;i.setAttribute('aria-label',p);i.style.textAlign='center';
    i.addEventListener('input',function(){setStyle(p,i.value);});i.addEventListener('change',function(){commit();renderCodeIfOpen();});r.appendChild(i);});
  w.appendChild(r);
  var hasL=LOGI.some(function(p){return n.style[p];});
  if(S.logical||hasL||LOGI.some(function(p){return S.pending[p];})){
    var g=document.createElement('div');g.style.cssText='display:flex;flex-direction:column;gap:5px;margin-top:6px';
    LOGI.forEach(function(p){
      if(!S.logical&&!n.style[p]&&!S.pending[p])return;
      var c=document.createElement('div');c.className='cust';c.innerHTML='<code>'+esc(p)+'</code>';
      var i=document.createElement('input');i.type='text';i.className='inp';i.id='f-'+p;i.value=n.style[p]||'';i.placeholder='auto';i.setAttribute('aria-label',p);
      i.addEventListener('input',function(){setStyle(p,i.value);});i.addEventListener('change',function(){commit();renderCodeIfOpen();});
      c.appendChild(i);g.appendChild(c);
    });
    w.appendChild(g);
  }
  return w;
}
function renderHtmlTab(n,box){
  var p=document.createElement('div');p.className='pad';box.appendChild(p);
  var isRoot=n.id===S.root.id;
  var chip=document.createElement('div');chip.className='chip';chip.innerHTML='<span>Inspecting:</span><b>&lt;'+esc(n.tag)+(n.attrs.id?'#'+esc(n.attrs.id):'')+'&gt;</b>';p.appendChild(chip);
  function fld(label,input){var w=document.createElement('div');w.className='fld';var l=document.createElement('label');l.textContent=label;w.appendChild(l);w.appendChild(input);p.appendChild(w);}
  function txt(v,ph,fn,after){var i=document.createElement('input');i.type='text';i.value=v||'';i.placeholder=ph||'';i.spellcheck=false;i.autocomplete='off';i.addEventListener('input',function(){fn(i.value);});i.addEventListener('change',function(){commit();renderLayers();renderCrumbs();renderCodeIfOpen();if(after)after();});return i;}
  if(isRoot){
    fld('Page title',txt(S.title,'my-page',function(v){S.title=v||'untitled-page';$('#projName').value=S.title;}));
    var t=document.createElement('p');t.className='note';t.innerHTML='You selected the page itself (<code>body</code>). Use the CSS tab to set its background, text colour, font and padding.';p.appendChild(t);return;
  }
  var sel=document.createElement('select');var tags=['div','section','header','nav','main','footer','article','aside','form','ul','ol','li','h1','h2','h3','h4','h5','h6','p','span','a','button','label','strong','em','small','blockquote','pre','code'];
  if(tags.indexOf(n.tag)<0)tags.unshift(n.tag);tags.forEach(function(t){var o=document.createElement('option');o.value=t;o.textContent=t;sel.appendChild(o);});sel.value=n.tag;sel.disabled=n.ns||VOID[n.tag];
  sel.addEventListener('change',function(){n.tag=sel.value;changed();});fld('Tag name',sel);
  fld('ID',txt(n.attrs.id,'e.g. hero-title',function(v){if(v)n.attrs.id=v.replace(/\s+/g,'-');else delete n.attrs.id;}));
  fld('Classes',txt(n.attrs['class'],'e.g. card featured',function(v){if(v.trim())n.attrs['class']=v;else delete n.attrs['class'];renderCanvas();placeOverlay();}));
  if(!VOID[n.tag]&&!n.ns){
    var ta=document.createElement('textarea');ta.value=n.text;ta.rows=3;ta.addEventListener('input',function(){n.text=ta.value;renderCanvas();placeOverlay();save();});ta.addEventListener('change',function(){commit();renderLayers();renderCodeIfOpen();});
    fld(n.children.length?'Text before child elements':'Text content',ta);
  }
  var h=document.createElement('div');h.className='lbl';h.textContent='Attributes';p.appendChild(h);
  Object.keys(n.attrs).filter(function(k){return k!=='id'&&k!=='class'&&!/^on/i.test(k);}).forEach(function(k){
    var r=document.createElement('div');r.className='arow';r.innerHTML='<code>'+esc(k)+'</code>';
    var i=document.createElement('input');i.type='text';i.className='inp';i.value=n.attrs[k];i.setAttribute('aria-label',k);
    i.addEventListener('input',function(){n.attrs[k]=i.value;renderCanvas();placeOverlay();save();});i.addEventListener('change',function(){commit();renderCodeIfOpen();});
    var x=document.createElement('button');x.type='button';x.textContent='×';x.setAttribute('aria-label','Remove '+k);x.addEventListener('click',function(){delete n.attrs[k];changed();});
    r.appendChild(i);r.appendChild(x);p.appendChild(r);
  });
  var ar=document.createElement('div');ar.className='arow';
  var kn=document.createElement('input');kn.type='text';kn.className='inp';kn.placeholder='name';kn.setAttribute('aria-label','New attribute name');
  var kv=document.createElement('input');kv.type='text';kv.className='inp';kv.placeholder='value';kv.setAttribute('aria-label','New attribute value');
  var kb=document.createElement('button');kb.type='button';kb.textContent='＋';kb.style.color='#60a5fa';kb.setAttribute('aria-label','Add attribute');
  kb.addEventListener('click',function(){var k=kn.value.trim().toLowerCase();if(!k||!/^[a-z][a-z0-9:_-]*$/.test(k)||/^on/.test(k)){toast('Use a plain attribute name like href or alt');return;}n.attrs[k]=kv.value;changed();});
  ar.appendChild(kn);ar.appendChild(kv);ar.appendChild(kb);p.appendChild(ar);
}
function renderJsTab(n,box){
  var p=document.createElement('div');p.className='pad';box.appendChild(p);
  var isRoot=n.id===S.root.id;
  var a=document.createElement('div');a.className='chip';a.innerHTML='<span>Element</span><b>'+esc(pathTo(n.id).map(function(x){return x.tag+(x.attrs.id?'#'+x.attrs.id:'');}).slice(-3).join(' › '))+'</b>';p.appendChild(a);
  if(!isRoot){
    var t=document.createElement('p');t.className='note';t.innerHTML='Short event handlers saved on this element. They run in <code>Preview</code> and in the exported page, not on the canvas.';p.appendChild(t);
    [['onclick','On click'],['onmouseover','On mouse over'],['oninput','On input']].forEach(function(e){
      var w=document.createElement('div');w.className='fld';var l=document.createElement('label');l.textContent=e[1]+' (JavaScript)';w.appendChild(l);
      var ta=document.createElement('textarea');ta.value=n.attrs[e[0]]||'';ta.rows=2;ta.spellcheck=false;ta.placeholder="e.g. alert('Hello')";
      ta.addEventListener('input',function(){if(ta.value.trim())n.attrs[e[0]]=ta.value;else delete n.attrs[e[0]];save();});ta.addEventListener('change',function(){commit();renderCodeIfOpen();});
      w.appendChild(ta);p.appendChild(w);
    });
  }
  var b=document.createElement('button');b.className='sbtn';b.type='button';b.textContent='Open the page script editor';b.addEventListener('click',function(){setView('js');});p.appendChild(b);
  var c=document.createElement('p');c.className='note';c.innerHTML='Tip: give an element an <code>ID</code> in the HTML tab, then use <code>document.getElementById</code> in the page script.';p.appendChild(c);
}
function renderCrumbs(){
  var box=$('#crumbPath');box.innerHTML='<button>html</button><i>›</i>';
  var p=pathTo(S.sel);
  p.forEach(function(n,i){var b=document.createElement('button');b.textContent=n.tag+(n.attrs.id?'#'+n.attrs.id:'');if(n.id===S.sel)b.className='on';b.addEventListener('click',function(){selectNode(n.id);});box.appendChild(b);if(i<p.length-1){var s=document.createElement('i');s.textContent='›';box.appendChild(s);}});
}

/* ---------- code generation ---------- */
function hasStyle(n){return Object.keys(n.style).length>0;}
function idFor(n){return n.attrs.id||(hasStyle(n)?'nx-'+n.id.slice(1):'');}
function attrStr(n){
  var s='',id=idFor(n);if(id)s+=' id="'+escA(id)+'"';
  if(n.attrs['class'])s+=' class="'+escA(n.attrs['class'])+'"';
  Object.keys(n.attrs).forEach(function(k){if(k==='id'||k==='class'||!k)return;var v=n.attrs[k];s+=v===''?' '+k:' '+k+'="'+escA(v)+'"';});
  return s;
}
function gen(n,d){
  var pad=new Array(d+1).join('  '),open='<'+n.tag+attrStr(n);
  if(VOID[n.tag]&&!n.ns)return pad+open+'>';
  if(n.ns&&!n.children.length&&!n.text)return pad+open+' />';
  if(!n.children.length)return pad+open+'>'+esc(n.text)+'</'+n.tag+'>';
  var s=pad+open+'>';if(n.text)s+='\n'+pad+'  '+esc(n.text);
  n.children.forEach(function(c){s+='\n'+gen(c,d+1);});return s+'\n'+pad+'</'+n.tag+'>';
}
function genBody(){return S.root.children.map(function(c){return gen(c,0);}).join('\n');}
function rule(sel,st){var k=Object.keys(st);if(!k.length)return '';return sel+' {\n'+k.map(function(p){return '  '+p+': '+st[p]+';';}).join('\n')+'\n}';}
function genCss(){
  var out=['*, *::before, *::after { box-sizing: border-box; }','body { margin: 0; }'];
  var b=rule('body',S.root.style);if(b)out.push(b.replace('body {','body {'));
  S.root.children.forEach(function(c){walk(c,function(n){var id=idFor(n);if(id&&hasStyle(n))out.push(rule('#'+id,n.style));});});
  return out.join('\n\n');
}
function fullDoc(){
  return '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>'+esc(S.title)+'</title>\n'+
   '<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">\n<style>\n'+genCss()+(S.css.trim()?'\n\n'+S.css.trim().replace(/<\/style/gi,'<\\/style'):'')+'\n</style>\n</head>\n<body>\n'+genBody()+'\n'+(S.js.trim()?'<script>\n'+S.js.replace(/<\/script/gi,'<\\/script')+'\n<\/script>\n':'')+'</body>\n</html>\n';
}

/* ---------- import ---------- */
function parseEl(el){
  var tag=el.localName;if(BLOCKED_TAGS[tag.toLowerCase()])return null;
  var n=N(tag,{ns:el.namespaceURI===SVGNS});
  var raw={};Array.prototype.forEach.call(el.attributes,function(a){raw[a.name]=a.value;});n.attrs=cleanAttrs(raw);
  for(var i=0;i<el.style.length;i++){var nm=el.style[i];n.style[nm]=el.style.getPropertyValue(nm);}
  var kids=Array.prototype.filter.call(el.childNodes,function(c){return c.nodeType===1;}),texts=[];
  Array.prototype.forEach.call(el.childNodes,function(c){
    if(c.nodeType===3){var t=c.textContent.replace(/\s+/g,' ').trim();if(!t)return;
      if(!kids.length)n.text=(n.text?n.text+' ':'')+t;else n.children.push(N('span',{text:t}));}
    else if(c.nodeType===1){var ch=parseEl(c);if(ch)n.children.push(ch);}
  });
  return n;
}
function importHtml(src,full){
  var doc=new DOMParser().parseFromString(src,'text/html'),root=N('body'),css='',js='';
  if(full){
    for(var i=0;i<doc.body.style.length;i++){var nm=doc.body.style[i];root.style[nm]=doc.body.style.getPropertyValue(nm);}
    Array.prototype.forEach.call(doc.querySelectorAll('style'),function(s){css+=s.textContent+'\n';});
    Array.prototype.forEach.call(doc.querySelectorAll('script:not([src])'),function(s){js+=s.textContent+'\n';});
    var t=doc.querySelector('title');if(t&&t.textContent.trim())S.title=t.textContent.trim();
  }else{root.style=Object.assign({},S.root.style);}
  Array.prototype.forEach.call(doc.body.children,function(c){var n=parseEl(c);if(n)root.children.push(n);});
  S.root=root;if(full){S.css=css;S.js=js;}S.sel=root.id;S.pending={};$('#projName').value=S.title;fixUid();
}

/* ---------- views ---------- */
function setView(v){
  S.view=v;
  Array.prototype.forEach.call($('#views').children,function(b){b.classList.toggle('on',b.getAttribute('data-v')===v);});
  var map={canvas:'#stage',html:'#vHtml',css:'#vCss',js:'#vJs',preview:'#vPrev'};
  Object.keys(map).forEach(function(k){$(map[k]).hidden=(k!==v);});
  $('#rulerbar').hidden=!(S.rulers&&v==='canvas');
  renderCodeIfOpen();placeOverlay();
}
function refreshPreview(){
  var pv=$('#pv'),html=fullDoc();
  if(D){D.setPreview(html).then(function(ok){if(ok)pv.src='nx-preview://p/index.html?t='+Date.now();});}
  else pv.srcdoc=html;
}
function renderCodeIfOpen(){
  if(S.view==='html')$('#codeHtml').value=genBody();
  else if(S.view==='css'){$('#codeCss').value=genCss();$('#codeCustom').value=S.css;}
  else if(S.view==='js')$('#codeJs').value=S.js;
  else if(S.view==='preview')refreshPreview();
}

/* ---------- misc ui ---------- */
var tt=null;
function toast(m){var t=$('#toast');t.textContent=m;t.hidden=false;clearTimeout(tt);tt=setTimeout(function(){t.hidden=true;},1800);}
function openModal(title,note,text,okLabel,okFn){
  $('#mTitle').textContent=title;$('#mNote').textContent=note;$('#mText').value=text;$('#mText').readOnly=!okFn;
  var ok=$('#mOk');ok.hidden=!okFn;ok.textContent=okLabel||'OK';ok.onclick=function(){okFn($('#mText').value);};
  $('#modal').hidden=false;$('#mText').focus();$('#mText').select();
}
function closeModal(){$('#modal').hidden=true;}
function copyText(text,msg){
  function fb(){openModal('Copy your code','Your browser blocked automatic copying. The text is selected, so press Ctrl+C (or ⌘C on Mac).',text,null,null);}
  try{if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(text).then(function(){toast(msg||'Copied');},fb);return;}}catch(e){}
  fb();
}
function projectJson(){return JSON.stringify({format:'nexusstudio',version:1,root:S.root,css:S.css,js:S.js,title:S.title});}
function parseProject(text){var o=JSON.parse(text);if(!o||o.format!=='nexusstudio')throw new Error('This file is not a NexusStudio project.');return cleanState(o);}
function needDesktop(){toast('This works in the NexusStudio desktop app');}
function afterNew(){S.file=null;S.dirty=false;if(D)D.newProject();if(D)D.setDocName(S.title);}
var ACT={
  newBlank:function(){loadState(blank());afterNew();toast('New blank page');},
  sample:function(){loadState(sample());afterNew();toast('Sample page loaded');},
  importHtml:function(){openModal('Import HTML','Paste a full page or just body markup. Classes from stylesheets stay as classes; inline styles become editable properties.','',"Import",function(v){
    if(!v.trim())return;importHtml(v,/<html|<body|<!doctype/i.test(v));changed();closeModal();toast('Imported');});},
  copyAll:function(){copyText(fullDoc(),'Full page HTML copied');},
  openProject:function(){if(!D)return needDesktop();D.openProject().then(function(r){if(!r||r.canceled)return;if(r.error)return toast(r.error);
    try{loadState(parseProject(r.text));S.file=r.name;S.dirty=false;D.setDocName(S.file);toast('Opened '+r.name);}catch(e){toast('Could not open: '+e.message);}});},
  saveProject:function(){ACT.saveWith(false);},
  saveAs:function(){ACT.saveWith(true);},
  saveWith:function(as){if(!D)return needDesktop();D.saveProject(projectJson(),as,S.title).then(function(r){if(!r||r.canceled)return;if(r.error)return toast(r.error);S.file=r.name;S.dirty=false;D.setDocName(S.file);toast('Saved '+r.name);});},
  exportHtml:function(){if(!D)return needDesktop();D.exportHtml(fullDoc(),S.title).then(function(r){if(!r||r.canceled)return;toast(r.error||('Exported '+r.name));});},
  importFile:function(){if(!D)return needDesktop();D.importHtml().then(function(r){if(!r||r.canceled)return;if(r.error)return toast(r.error);
    importHtml(r.text,/<html|<body|<!doctype/i.test(r.text));changed();toast('Imported '+r.name);});},
  connectAi:function(){openAi();},
  undo:undo,redo:redo,dup:dupSel,del:delSel,up:function(){moveSel(-1);},down:function(){moveSel(1);},
  grid:function(){S.grid=!S.grid;stage.classList.toggle('nogrid',!S.grid);$('#tgGrid').classList.toggle('on',S.grid);},
  rulers:function(){S.rulers=!S.rulers;$('#rulerbar').hidden=!(S.rulers&&S.view==='canvas');$('#tgRuler').classList.toggle('on',S.rulers);},
  zoomReset:function(){setZoom(1);}
};
function closeMenus(){Array.prototype.forEach.call(document.querySelectorAll('.drop'),function(d){d.hidden=true;});}
document.addEventListener('click',function(e){
  var m=e.target.closest('[data-menu]');
  if(m){var d=m.nextElementSibling,was=!d.hidden;closeMenus();d.hidden=was;return;}
  var a=e.target.closest('[data-act]');
  if(a){var fn=ACT[a.getAttribute('data-act')];closeMenus();if(fn)fn();return;}
  if(!e.target.closest('.dd')&&e.target.id!=='propSearch')$('#dd').hidden=true;
  closeMenus();
});
$('#mClose').addEventListener('click',closeModal);
$('#modal').addEventListener('mousedown',function(e){if(e.target.id==='modal')closeModal();});

function setZoom(z){S.zoom=Math.min(2,Math.max(0.3,Math.round(z*10)/10));page.style.transform='scale('+S.zoom+')';sizeFrame();
  $('#zoomVal').textContent=Math.round(S.zoom*100)+'%';$('#zoomLab').textContent=Math.round(S.zoom*100)+'%';placeOverlay();}
function setDevice(w,h){
  S.dw=Math.max(120,Math.min(10000,w|0||880));if(h)S.dh=Math.max(120,Math.min(20000,h|0));
  $('#vw').value=S.dw;$('#vh').value=S.dh;
  Array.prototype.forEach.call($('#devs').children,function(b){b.classList.toggle('on',+b.getAttribute('data-w')===S.dw);});
  page.style.width=S.dw+'px';page.style.minHeight=S.dh+'px';sizeFrame();placeOverlay();
}
$('#devs').addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;var w=+b.getAttribute('data-w');setDevice(w,w===880?640:(w===768?1024:844));});
$('#vw').addEventListener('change',function(){setDevice(parseInt(this.value,10)||S.dw);});
$('#vh').addEventListener('change',function(){setDevice(S.dw,parseInt(this.value,10)||S.dh);});
$('#rotate').addEventListener('click',function(){setDevice(S.dh,S.dw);});
/* drag the frame edges to resize the viewport */
Array.prototype.forEach.call(document.querySelectorAll('.frh'),function(h){
  h.addEventListener('pointerdown',function(e){
    e.preventDefault();e.stopPropagation();
    var dir=h.getAttribute('data-dir'),sx=e.clientX,sy=e.clientY;
    var w0=S.dw,h0=Math.max(S.dh,page.offsetHeight||S.dh);
    try{h.setPointerCapture(e.pointerId);}catch(x){}
    function mv(ev){
      var w=w0,ht=h0;
      if(dir.indexOf('e')>=0)w=Math.max(120,Math.round(w0+(ev.clientX-sx)/S.zoom));
      if(dir.indexOf('s')>=0)ht=Math.max(120,Math.round(h0+(ev.clientY-sy)/S.zoom));
      setDevice(w,ht);
    }
    function up(){h.removeEventListener('pointermove',mv);h.removeEventListener('pointerup',up);}
    h.addEventListener('pointermove',mv);h.addEventListener('pointerup',up);
  });
});
$('#zIn').addEventListener('click',function(){setZoom(S.zoom+0.1);});
$('#zOut').addEventListener('click',function(){setZoom(S.zoom-0.1);});
$('#tgGrid').addEventListener('click',ACT.grid);$('#tgRuler').addEventListener('click',ACT.rulers);

$('#tabEl').addEventListener('click',function(){S.ltab='el';syncLeft();});
$('#tabLy').addEventListener('click',function(){S.ltab='ly';syncLeft();});
function syncLeft(){$('#tabEl').classList.toggle('on',S.ltab==='el');$('#tabLy').classList.toggle('on',S.ltab==='ly');$('#elPane').hidden=S.ltab!=='el';$('#lyPane').hidden=S.ltab!=='ly';}
['Html','Css','Js'].forEach(function(t){$('#rt'+t).addEventListener('click',function(){S.rtab=t.toLowerCase();renderProps();});});
$('#views').addEventListener('click',function(e){var b=e.target.closest('button');if(b)setView(b.getAttribute('data-v'));});
$('#elSearch').addEventListener('input',renderPalette);
$('#projName').addEventListener('input',function(){S.title=this.value||'untitled-page';save();});
$('#projName').addEventListener('change',function(){commit();});

/* property search + quick add */
function addProp(name){
  $('#dd').hidden=true;$('#propSearch').value='';
  if(S.rtab!=='css'){S.rtab='css';}
  if(LOGI.indexOf(name)>=0){S.logical=true;S.pending[name]=1;S.open.layout=1;}
  else if(KNOWN[name]){S.open[KNOWN[name]]=1;}
  else S.pending[name]=1;
  renderProps();
  var i=document.getElementById('f-'+name);
  if(i){i.focus();var w=i.closest('.fld,.cust');if(w){w.classList.add('flash');setTimeout(function(){w.classList.remove('flash');},1400);}if(i.scrollIntoView)i.scrollIntoView({block:'nearest'});}
}
function filterProps(q){
  var dd=$('#dd');q=(q||'').trim().toLowerCase();
  if(!q){dd.hidden=true;dd.innerHTML='';return;}
  var res=CSSLIST.filter(function(p){return p.indexOf(q)===0;}).concat(CSSLIST.filter(function(p){return p.indexOf(q)>0;})).slice(0,40);
  if(!res.length){dd.hidden=true;return;}
  dd.innerHTML='';res.forEach(function(p){var b=document.createElement('button');b.type='button';b.innerHTML='<span>'+esc(p)+'</span><span style="color:#a1a1aa">+ Add</span>';b.addEventListener('click',function(){addProp(p);});dd.appendChild(b);});
  dd.hidden=false;
}
$('#propSearch').addEventListener('input',function(){filterProps(this.value);});
$('#propSearch').addEventListener('focus',function(){filterProps(this.value);});
$('#propSearch').addEventListener('keydown',function(e){if(e.key==='Enter'){var v=this.value.trim().toLowerCase();if(/^-{0,2}[a-z][a-z0-9-]*$/.test(v))addProp(v);}});
$('#addbar').addEventListener('click',function(e){var b=e.target.closest('[data-add]');if(b)addProp(b.getAttribute('data-add'));});

/* code view buttons */
$('#htmlCopy').addEventListener('click',function(){copyText($('#codeHtml').value,'HTML copied');});
$('#htmlApply').addEventListener('click',function(){importHtml($('#codeHtml').value,false);changed();renderCodeIfOpen();toast('Design updated from code');});
$('#cssCopy').addEventListener('click',function(){copyText(genCss()+(S.css.trim()?'\n\n'+S.css.trim():'')+'\n','CSS copied');});
$('#codeCustom').addEventListener('input',function(){S.css=this.value;renderCanvas();save();});
$('#codeCustom').addEventListener('change',function(){commit();});
$('#codeJs').addEventListener('input',function(){S.js=this.value;save();});
$('#codeJs').addEventListener('change',function(){commit();});
$('#jsCopy').addEventListener('click',function(){copyText(S.js,'JavaScript copied');});
$('#prevReload').addEventListener('click',refreshPreview);

/* keyboard */
document.addEventListener('keydown',function(e){
  var t=e.target,typing=t&&(/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)||t.isContentEditable);
  var mod=e.ctrlKey||e.metaKey,k=e.key.toLowerCase();
  if(mod&&k==='s'){e.preventDefault();ACT.saveWith(e.shiftKey);return;}
  if(mod&&k==='o'){e.preventDefault();ACT.openProject();return;}
  if(typing||!$('#modal').hidden||!$('#aiModal').hidden)return;
  if(mod&&k==='z'){e.preventDefault();e.shiftKey?redo():undo();}
  else if(mod&&k==='y'){e.preventDefault();redo();}
  else if(mod&&k==='d'){e.preventDefault();dupSel();}
  else if(e.key==='Delete'||e.key==='Backspace'){if(S.view==='canvas'){e.preventDefault();delSel();}}
  else if(e.altKey&&e.key==='ArrowUp'){e.preventDefault();moveSel(-1);}
  else if(e.altKey&&e.key==='ArrowDown'){e.preventDefault();moveSel(1);}
  else if(e.key==='Escape'){closeMenus();var f=find(S.sel);if(f&&f.parent)selectNode(f.parent.id);}
});
window.addEventListener('resize',placeOverlay);
if(typeof ResizeObserver!=='undefined')new ResizeObserver(function(){sizeFrame();placeOverlay();}).observe(page);

/* ---------- boot ---------- */
function renderAll(){
  renderCanvas();renderLayers();renderProps();renderCrumbs();renderCodeIfOpen();syncUndo();
  requestAnimationFrame(placeOverlay);
}
function boot(){
  var st=null;
  try{var raw=localStorage.getItem(KEY);if(raw){st=cleanState(JSON.parse(raw));}}catch(e){st=null;}
  if(!st)st=sample();
  S.root=st.root;S.css=st.css||'';S.js=st.js||'';S.title=st.title||'nebula-landing-v2';S.sel=S.root.id;fixUid();
  $('#projName').value=S.title;
  hist=[snap()];hi=0;
  renderPalette();syncLeft();setDevice(880,640);
  var avail=stage.clientWidth-40;if(avail>200&&avail<880)S.zoom=Math.max(0.3,Math.floor(avail/880*10)/10);
  else if(avail>=200&&avail<880+40)S.zoom=1;
  $('#zoomVal').textContent=Math.round(S.zoom*100)+'%';$('#zoomLab').textContent=Math.round(S.zoom*100)+'%';
  renderAll();setView('canvas');S.dirty=false;if(D)D.setDocName(S.title);
}
/* ---------- automation API (used by the AI server and by tests) ---------- */
var API={};
var MAX_ELEMENTS=5000;
var __consoleLogs=[];

// Capture console logs for inspection
var origConsole={log:console.log,warn:console.warn,error:console.error,info:console.info,debug:console.debug};
['log','warn','error','info','debug'].forEach(function(m){
  console[m]=function(){
    var args=Array.from(arguments);
    var msg=args.map(function(a){return typeof a==='object'?JSON.stringify(a):String(a);}).join(' ');
    __consoleLogs.push({level:m,timestamp:Date.now(),message:msg,args:args});
    if(__consoleLogs.length>1000)__consoleLogs.shift();
    origConsole[m].apply(console,args);
  };
});
function resolveId(id){
  if(id==null||id==='body'||id==='root'||id==='page')return S.root.id;
  var m=/^nx-(\d+)$/.exec(String(id));if(m)return 'n'+m[1];
  return String(id);
}
function need(id){var f=find(resolveId(id));if(!f)throw new Error('No element has the id "'+id+'". Call get_tree to see the current ids.');return f;}
function countNodes(){var c=0;walk(S.root,function(){c++;});return c;}
function short(t,n){t=String(t||'');return t.length>n?t.slice(0,n)+'…':t;}
function pubId(n){return n.id===S.root.id?'body':n.id;}
function describe(n,depth,max){
  var o={id:pubId(n),tag:n.tag};
  if(n.text)o.text=short(n.text,200);
  if(Object.keys(n.attrs).length)o.attrs=n.attrs;
  if(Object.keys(n.style).length)o.style=n.style;
  if(n.children.length){
    if(depth<max)o.children=n.children.map(function(c){return describe(c,depth+1,max);});
    else o.children_hidden=n.children.length;
  }
  return o;
}
function rectOf(id){
  var el=elOf(resolveId(id));if(!el)return null;
  var r=el.getBoundingClientRect(),p=page.getBoundingClientRect(),z=S.zoom;
  return {x:Math.round((r.left-p.left)/z),y:Math.round((r.top-p.top)/z),width:Math.round(r.width/z),height:Math.round(r.height/z)};
}
function applyStyleMap(n,map){
  var cs=cleanStyle(map);
  Object.keys(cs).forEach(function(k){if(cs[k]===null)delete n.style[k];else n.style[k]=cs[k];});
}
function mkNode(a,depth){
  if(!isObj(a))throw new Error('Each element must be an object with a "tag".');
  if(depth>40)throw new Error('Elements are nested too deeply.');
  var tag=safeTag(a.tag),svg=SVGCASE[tag.toLowerCase()];
  if(svg)tag=svg;
  var n=(a.use_preset&&!svg&&!BLOCKED_TAGS[tag.toLowerCase()])?make(tag):N(tag,{ns:svg?1:0});
  if(n.tag!==tag){n=N(tag,{ns:svg?1:0});}
  if(a.text!=null)n.text=String(a.text).slice(0,200000);
  if(a.attrs)Object.assign(n.attrs,cleanAttrs(a.attrs));
  if(a.style)applyStyleMap(n,a.style);
  if(Array.isArray(a.children)){
    if(VOID[n.tag]&&!n.ns)throw new Error('<'+n.tag+'> cannot contain other elements.');
    a.children.forEach(function(c){n.children.push(mkNode(c,depth+1));});
  }
  return n;
}
function place(n,a){
  var f=need(a.parent_id),pos=a.position||'inside';
  if(['inside','before','after'].indexOf(pos)<0)throw new Error('position must be "inside", "before" or "after".');
  if(pos==='inside'){
    var par=f.node;
    if(VOID[par.tag]&&!par.ns)throw new Error('<'+par.tag+'> cannot contain other elements.');
    var i=typeof a.index==='number'?Math.max(0,Math.min(par.children.length,Math.floor(a.index))):par.children.length;
    par.children.splice(i,0,n);
  }else{
    if(!f.parent)throw new Error('Nothing can go before or after the page body. Use position "inside".');
    f.parent.children.splice(f.index+(pos==='after'?1:0),0,n);
  }
}
function parseSnippet(html){
  if(typeof html!=='string')throw new Error('"html" must be a string.');
  var doc=new DOMParser().parseFromString(html,'text/html'),nodes=[];
  Array.prototype.forEach.call(doc.body.childNodes,function(c){
    if(c.nodeType===1){var n=parseEl(c);if(n)nodes.push(n);}
    else if(c.nodeType===3&&c.textContent.trim())nodes.push(N('span',{text:c.textContent.replace(/\s+/g,' ').trim()}));
  });
  return nodes;
}

API.get_document=function(){
  return {title:S.title,html:genBody(),custom_css:S.css,generated_css:genCss(),js:S.js,selected:pubId(find(S.sel).node),element_count:countNodes(),
    note:'In the html, ids look like nx-12. In get_tree they look like n12. Both work as element ids.'};
};
API.get_tree=function(a){
  var f=need(a.id),max=typeof a.max_depth==='number'?Math.max(0,Math.min(30,Math.floor(a.max_depth))):6;
  return describe(f.node,0,max);
};
API.get_element=function(a){var f=need(a.id);var o=describe(f.node,0,1);o.rect=rectOf(f.node.id);o.parent=f.parent?pubId(f.parent):null;return o;};
API.find_elements=function(a){
  var lim=Math.min(200,typeof a.limit==='number'?a.limit:50),out=[];
  var tag=a.tag&&String(a.tag).toLowerCase(),txt=a.text&&String(a.text).toLowerCase(),cls=a.class_name,idA=a.id_attr;
  (function rec(n,path){
    var here=path.concat(n.tag);
    if(n.id!==S.root.id){
      var ok=true;
      if(tag&&n.tag.toLowerCase()!==tag)ok=false;
      if(txt&&String(n.text||'').toLowerCase().indexOf(txt)<0)ok=false;
      if(cls&&(' '+(n.attrs['class']||'')+' ').indexOf(' '+cls+' ')<0)ok=false;
      if(idA&&n.attrs.id!==idA)ok=false;
      if(ok&&out.length<lim)out.push({id:n.id,tag:n.tag,path:here.join(' > '),text:short(n.text,80)});
    }
    n.children.forEach(function(c){rec(c,here);});
  })(S.root,[]);
  return {count:out.length,matches:out};
};
API.get_selection=function(){var f=find(S.sel);var o=describe(f.node,0,1);o.rect=rectOf(f.node.id);return o;};

API.get_computed_style=function(a){
  var f=need(a.id),el=elOf(f.node.id);
  if(!el)return null;
  var cs=getComputedStyle(el),out={};
  var props=a.properties&&Array.isArray(a.properties)?a.properties:null;
  if(props){
    props.forEach(function(p){out[p]=cs.getPropertyValue(p);});
  }else{
    for(var i=0;i<cs.length;i++){out[cs[i]]=cs.getPropertyValue(cs[i]);}
  }
  return {id:pubId(f.node),computed:out};
};

API.get_accessibility=function(a){
  var f=need(a.id),el=elOf(f.node.id);
  if(!el)return null;
  var cs=getComputedStyle(el),out={};
  out.role=el.getAttribute('role')||el.tagName.toLowerCase();
  out.accessibleName=el.getAttribute('aria-label')||el.getAttribute('title')||el.textContent||'';
  out.accessibleValue=el.getAttribute('aria-value')||null;
  out.state={};
  ['aria-expanded','aria-checked','aria-selected','aria-disabled','aria-pressed','aria-hidden'].forEach(function(k){
    var v=el.getAttribute(k);
    if(v!==null)out.state[k]=v;
  });
  out.tabIndex=el.tabIndex;
  out.focusable=el.tabIndex>=0&&out.state['aria-disabled']!=='true';
  out.hidden=el.hidden||cs.display==='none'||cs.visibility==='hidden';
  return {id:pubId(f.node),accessibility:out};
};

API.get_console_logs=function(a){
  var level=a&&a.level,limit=a&&typeof a.limit==='number'?Math.max(1,Math.min(200,Math.floor(a.limit))):50;
  var logs=__consoleLogs.slice();
  if(level)logs=logs.filter(function(l){return l.level===level;});
  return {count:logs.length,logs:logs.slice(-limit)};
};

API.inspect_element=function(a){
  var f=need(a.id),el=elOf(f.node.id);
  if(!el)return null;
  var tree=describe(f.node,0,0);
  var rect=rectOf(f.node.id);
  var cs=getComputedStyle(el),computed={};
  for(var i=0;i<cs.length;i++){computed[cs[i]]=cs.getPropertyValue(cs[i]);}
  var acc={role:el.getAttribute('role')||el.tagName.toLowerCase(),
    accessibleName:el.getAttribute('aria-label')||el.getAttribute('title')||el.textContent||''};
  ['aria-expanded','aria-checked','aria-selected','aria-disabled','aria-pressed','aria-hidden'].forEach(function(k){
    var v=el.getAttribute(k);if(v!==null)acc[k]=v;
  });
  return {
    id:pubId(f.node),
    tree:tree,
    rect:rect,
    computed:computed,
    accessibility:acc,
    offsetWidth:el.offsetWidth,
    offsetHeight:el.offsetHeight,
    scrollWidth:el.scrollWidth,
    scrollHeight:el.scrollHeight,
    clientWidth:el.clientWidth,
    clientHeight:el.clientHeight,
    tagName:el.tagName,
    attributes:{},
    interactive:{
      focusable:el.tabIndex>=0,
      disabled:el.disabled||false,
      checked:el.checked||false,
      selected:el.selected||false,
      editable:el.isContentEditable
    }
  };
};
API.select_element=function(a){var f=need(a.id);selectNode(f.node.id);return describe(f.node,0,0);};
API.get_full_html=function(){return fullDoc();};

API.add_element=function(a){
  var n=mkNode(a,0);place(n,a);S.sel=n.id;
  return {id:n.id,element:describe(n,0,2)};
};
API.add_html=function(a){
  var nodes=parseSnippet(a.html);
  if(!nodes.length)throw new Error('No usable elements were found in that HTML. Scripts, styles and links are ignored; use set_js and set_css for those.');
  var pos=a.position||'inside';
  nodes.forEach(function(n,i){
    if(pos==='inside')place(n,{parent_id:a.parent_id,position:'inside',index:typeof a.index==='number'?a.index+i:undefined});
    else if(pos==='before')place(n,{parent_id:a.parent_id,position:'before'});
    else place(n,{parent_id:i===0?a.parent_id:nodes[i-1].id,position:'after'});
  });
  S.sel=nodes[0].id;
  return {added:nodes.length,ids:nodes.map(function(n){return n.id;})};
};
API.update_element=function(a){
  var f=need(a.id),n=f.node;
  if(n.id===S.root.id){
    if(a.text!=null||a.tag!=null||a.attrs)throw new Error('On "body" only styles can be changed.');
  }
  if(a.tag!=null){
    var t=safeTag(a.tag);
    if(n.ns)throw new Error('The tag of an SVG element cannot be changed.');
    n.tag=t;
    if(VOID[t]){n.children=[];n.text='';}
  }
  if(a.text!=null){
    if(VOID[n.tag]&&!n.ns)throw new Error('<'+n.tag+'> cannot have text.');
    n.text=String(a.text).slice(0,200000);
  }
  if(a.attrs){
    if(!isObj(a.attrs))throw new Error('"attrs" must be an object.');
    var keep={};
    Object.keys(a.attrs).forEach(function(k){
      if(a.attrs[k]===null||a.attrs[k]===false)delete n.attrs[k];else keep[k]=a.attrs[k];
    });
    Object.assign(n.attrs,cleanAttrs(keep));
  }
  if(a.style)applyStyleMap(n,a.style);
  S.sel=n.id;
  return describe(n,0,1);
};
API.move_element=function(a){
  var f=need(a.id);
  if(!f.parent)throw new Error('The page body cannot be moved.');
  var t=need(a.target_id);
  if(contains(f.node,t.node.id))throw new Error('An element cannot be moved into itself.');
  f.parent.children.splice(f.index,1);
  place(f.node,{parent_id:a.target_id,position:a.position,index:a.index});
  S.sel=f.node.id;
  return {id:f.node.id};
};
API.duplicate_element=function(a){
  var f=need(a.id);
  if(!f.parent)throw new Error('The page body cannot be duplicated.');
  var c=clone(f.node);f.parent.children.splice(f.index+1,0,c);S.sel=c.id;
  return {id:c.id};
};
API.delete_element=function(a){
  var f=need(a.id);
  if(!f.parent)throw new Error('The page body cannot be deleted. Use replace_body_html to clear it.');
  f.parent.children.splice(f.index,1);S.sel=f.parent.id;
  return {deleted:resolveId(a.id)};
};
API.replace_body_html=function(a){
  var nodes=parseSnippet(a.html);
  if(!nodes.length&&String(a.html).trim())throw new Error('No usable elements were found in that HTML.');
  S.root.children=nodes;S.sel=S.root.id;
  return {added:nodes.length};
};
API.set_css=function(a){
  if(typeof a.css!=='string')throw new Error('"css" must be a string.');
  if(/<\/style/i.test(a.css))throw new Error('The CSS must not contain </style>.');
  S.css=a.append&&S.css?S.css+'\n'+a.css:a.css;
  return {length:S.css.length};
};
API.set_js=function(a){
  if(typeof a.js!=='string')throw new Error('"js" must be a string.');
  S.js=a.append&&S.js?S.js+'\n'+a.js:a.js;
  return {length:S.js.length};
};
API.set_title=function(a){
  if(typeof a.title!=='string'||!a.title.trim())throw new Error('"title" must be some text.');
  S.title=a.title.trim().slice(0,120);$('#projName').value=S.title;
  return {title:S.title};
};
API.set_viewport=function(a){
  if(typeof a.width==='number'||typeof a.height==='number')setDevice(typeof a.width==='number'?a.width:S.dw,typeof a.height==='number'?a.height:S.dh);
  if(typeof a.zoom==='number')setZoom(a.zoom);
  return {width:S.dw,height:S.dh,zoom:S.zoom};
};
API.batch=function(a){
  if(!Array.isArray(a.operations))throw new Error('"operations" must be a list.');
  if(a.operations.length>200)throw new Error('A batch can have at most 200 steps.');
  var out=[];
  a.operations.forEach(function(op,i){
    if(!isObj(op)||typeof op.tool!=='string')throw new Error('Step '+(i+1)+' needs a "tool" name.');
    var fn=Object.prototype.hasOwnProperty.call(API,op.tool)?API[op.tool]:null;
    if(!fn||op.tool==='batch'||op.tool==='undo'||op.tool==='redo'||op.tool==='new_document'||op.tool.indexOf('__')===0)throw new Error('Step '+(i+1)+': "'+op.tool+'" cannot be used in a batch.');
    try{out.push(fn(isObj(op.arguments)?op.arguments:{}));}
    catch(e){throw new Error('Step '+(i+1)+' ('+op.tool+') failed: '+e.message+' Nothing was changed.');}
  });
  return {steps:out.length,results:out};
};

/* These do their own history handling or change nothing. */
API.new_document=function(a){
  var st=a.template==='sample'?sample():blank();
  S.root=st.root;S.css='';S.js='';S.title=st.title;S.sel=S.root.id;S.collapsed={};S.pending={};
  $('#projName').value=S.title;fixUid();commit();renderAll();afterNew();
  return {ok:true,template:a.template==='sample'?'sample':'blank'};
};
API.undo=function(){undo();return {can_undo:hi>0,can_redo:hi<hist.length-1};};
API.redo=function(){redo();return {can_undo:hi>0,can_redo:hi<hist.length-1};};
API.__prepare_screenshot=function(a){
  setView('canvas');
  if(a.element_id){
    var f=need(a.element_id);selectNode(f.node.id);
    var el=elOf(f.node.id);if(el&&el.scrollIntoView)el.scrollIntoView({block:'center',inline:'center'});
  }
  if(a.hide_selection)ov.hidden=true;else placeOverlay();
  return new Promise(function(res){
    requestAnimationFrame(function(){requestAnimationFrame(function(){
      var r=stage.getBoundingClientRect();res({x:r.left,y:r.top,width:r.width,height:r.height});
    });});
  });
};
API.__after_screenshot=function(){placeOverlay();return true;};
['get_document','get_tree','get_element','find_elements','get_selection','select_element','get_full_html','new_document','undo','redo','__prepare_screenshot','__after_screenshot','get_computed_style','get_accessibility','get_console_logs','inspect_element'].forEach(function(k){API[k].raw=true;});

function callApi(m,p){
  if(!Object.prototype.hasOwnProperty.call(API,m))throw new Error('Unknown method: '+m);
  var fn=API[m];p=isObj(p)?p:{};
  if(fn.raw)return fn(p);
  var before=snap();
  try{
    var r=fn(p);
    if(countNodes()>MAX_ELEMENTS)throw new Error('That would make the page larger than '+MAX_ELEMENTS+' elements.');
    if(!find(S.sel))S.sel=S.root.id;
    pathTo(S.sel).forEach(function(n){delete S.collapsed[n.id];});
    if(snap()!==before){commit();renderAll();}
    return r;
  }catch(e){
    if(snap()!==before)restore(before);
    throw e;
  }
}
window.NexusAPI={call:callApi};

if(D&&D.onAiRequest){
  D.onAiRequest(function(msg){
    Promise.resolve().then(function(){return callApi(msg.method,msg.params);})
      .then(function(r){D.aiRespond(msg.id,true,r===undefined?null:r);})
      .catch(function(e){D.aiRespond(msg.id,false,e&&e.message?e.message:String(e));});
  });
}
var busyTimer=null;
if(D&&D.onAiActivity){
  D.onAiActivity(function(m){
    toast('AI: '+String(m.tool).replace(/_/g,' '));
    var d=$('#aiDot');d.className='aid busy';clearTimeout(busyTimer);busyTimer=setTimeout(function(){d.className='aid on';},1200);
  });
}

/* ---------- "Connect an AI assistant" dialog ---------- */
var aiInfo=null;
function fillAi(i){
  aiInfo=i;if(!i)return;
  var on=!!i.running;
  $('#aiDot').className='aid'+(on?' on':'');$('#aiDot2').className='aid'+(on?' on':'');
  $('#aiStatus').textContent=on?'AI server is on at '+i.url:'AI server is off';
  $('#aiToggle').textContent=on?'Turn off':'Turn on';
  $('#aiCmd').value=i.claudeCodeCommand;
  var t=$('#aiTools');t.innerHTML='';
  (i.tools||[]).forEach(function(x){var s=document.createElement('span');s.textContent=x.name;s.title=x.title;t.appendChild(s);});
}
function openAi(){
  if(!D){toast('The AI server is part of the desktop app');return;}
  $('#aiMsg').textContent='';$('#aiModal').hidden=false;D.mcpInfo().then(fillAi);
}
function closeAi(){$('#aiModal').hidden=true;}
$('#aiClose').addEventListener('click',closeAi);
$('#aiModal').addEventListener('mousedown',function(e){if(e.target.id==='aiModal')closeAi();});
$('#aiToggle').addEventListener('click',function(){if(D&&aiInfo)D.mcpSetEnabled(!aiInfo.running).then(fillAi);});
$('#aiInstall').addEventListener('click',function(){if(D)D.mcpInstallClaudeDesktop().then(function(r){$('#aiMsg').textContent=r?r.message:'';});});
$('#aiCopyDesktop').addEventListener('click',function(){if(aiInfo)copyText(aiInfo.desktopConfig,'Config copied');});
$('#aiCopyCmd').addEventListener('click',function(){if(aiInfo)copyText(aiInfo.claudeCodeCommand,'Command copied');});
$('#aiCopyUrl').addEventListener('click',function(){if(aiInfo)copyText(aiInfo.url,'Address copied');});
$('#aiCopyToken').addEventListener('click',function(){if(aiInfo)copyText(aiInfo.token,'Secret key copied');});
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!$('#aiModal').hidden){closeAi();e.stopPropagation();}},true);
if(D)D.mcpInfo().then(function(i){if(i)fillAi(i);});

boot();
})();
