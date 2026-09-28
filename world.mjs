import * as THREE from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {topic,topics,getCategories} from './data.mjs';
import {woodMap,noiseMap,bookFace,spineMap,pageEdges,innerPage,folderFace,contactMap} from './materials.mjs';

const clamp=THREE.MathUtils.clamp;
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
const mix=(a,b,t)=>a+(b-a)*t;
const vec=(a)=>new THREE.Vector3(...a);

export class ReadingRoom {
  constructor(canvas,{onActivate,onReady,reduced=()=>false}={}){
    this.canvas=canvas;this.onActivate=onActivate;this.onReady=onReady;this.reduced=reduced;
    this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));
    this.renderer.shadowMap.enabled=true;
    this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate=false;
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure=1.0;
    this.scene=new THREE.Scene();
    this.scene.background=new THREE.Color('#272923');
    this.scene.fog=new THREE.Fog('#272923',17,35);
    this.camera=new THREE.PerspectiveCamera(39,1,.08,60);
    this.look=new THREE.Vector3();
    this.raycaster=new THREE.Raycaster();this.pointer=new THREE.Vector2(-10,-10);
    this.parallax=new THREE.Vector2();this.pointerGoal=new THREE.Vector2();
    this.view='shelf';this.archiveCategory=null;this.hovered=null;this.tween=null;this.frame=0;this.last=0;
    this.topicId=topic.id;this.interactables=[];this.folderGroups=[];this.books=new Map();this.hoverAmounts=new Map();
    this.buildMaterials();this.buildLighting();this.buildRoom();this.buildCabinet();this.buildDesk();this.buildFolders();
    this.resize=()=>{this.renderer.setSize(innerWidth,innerHeight,false);this.camera.aspect=innerWidth/innerHeight;this.camera.fov=innerWidth<900?(this.view==='shelf'?43:(innerWidth<500?68:50)):39;this.camera.updateProjectionMatrix();this.invalidate();};
    this.resize();this.setView('shelf');this.bindEvents();
    this.canvas.dataset.renderer='three-webgl';
    this.invalidate();
    this.onReady?.();
  }

  buildMaterials(){
    this.woodTexture=woodMap(false);this.deskTexture=woodMap(true);
    const grain=noiseMap('#929292');grain.wrapS=grain.wrapT=THREE.RepeatWrapping;grain.repeat.set(6,6);
    this.clothMap=noiseMap('#888888',true);this.clothMap.wrapS=this.clothMap.wrapT=THREE.RepeatWrapping;this.clothMap.repeat.set(4,5);
    this.mat={
      wood:new THREE.MeshStandardMaterial({map:this.woodTexture,roughness:.48,bumpMap:this.woodTexture,bumpScale:.014,color:'#d9c9b6'}),
      edge:new THREE.MeshStandardMaterial({color:'#553821',roughness:.36}),
      desk:new THREE.MeshStandardMaterial({map:this.deskTexture,roughness:.42,bumpMap:this.deskTexture,bumpScale:.009}),
      brass:new THREE.MeshStandardMaterial({color:'#aa8550',metalness:.82,roughness:.28}),
      leather:new THREE.MeshStandardMaterial({color:'#48211e',bumpMap:this.clothMap,bumpScale:.013,roughness:.63}),
      paper:new THREE.MeshStandardMaterial({color:'#e5dbc5',roughness:.94}),
      green:new THREE.MeshStandardMaterial({color:'#284636',roughness:.2,metalness:.15}),
      plaster:new THREE.MeshStandardMaterial({color:'#42473d',roughness:.95,bumpMap:grain,bumpScale:.024}),
      dark:new THREE.MeshStandardMaterial({color:'#222821',roughness:.65}),
    };
    this.contactTexture=contactMap();
  }

  box(w,h,d,material,x=0,y=0,z=0,parent=this.scene,radius=.02){
    const geometry=new RoundedBoxGeometry(w,h,d,2,Math.min(radius,w/4,h/4,d/4));
    const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
  }
  cylinder(r1,r2,h,material,x,y,z,parent=this.scene){
    const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,40),material);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
  }
  plane(w,h,material,x,y,z,parent=this.scene){const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),material);m.position.set(x,y,z);m.receiveShadow=true;parent.add(m);return m;}
  contact(x,y,z,w,d,opacity=.5,parent=this.scene){
    const m=this.plane(w,d,new THREE.MeshBasicMaterial({map:this.contactTexture,transparent:true,opacity,depthWrite:false}),x,y,z,parent);
    m.rotation.x=-Math.PI/2;return m;
  }

  buildLighting(){
    const pmrem=new THREE.PMREMGenerator(this.renderer);
    const env=new RoomEnvironment();
    this.scene.environment=pmrem.fromScene(env,.025).texture;
    this.scene.environmentIntensity=.42;env.dispose();pmrem.dispose();
    this.scene.add(new THREE.HemisphereLight('#d1dfed','#7d5939',.66));
    const sun=new THREE.DirectionalLight('#ffe1af',2.5);
    sun.position.set(-3.8,7,5);sun.target.position.set(0,1,-.4);
    sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
    Object.assign(sun.shadow.camera,{left:-7,right:7,top:8,bottom:-5,near:.2,far:24});
    sun.shadow.bias=-.00025;sun.shadow.normalBias=.025;sun.shadow.radius=3;
    this.scene.add(sun,sun.target);
    const fill=new THREE.DirectionalLight('#b7d4ed',.72);fill.position.set(4,4,6);this.scene.add(fill);
    for(const y of [1.76,3.26,4.86]){
      const light=new THREE.PointLight('#ffda9d',.58,4,2);light.position.set(0,y,.05);this.scene.add(light);
    }
  }

  buildRoom(){
    this.box(18,.15,18,this.mat.desk,0,-.15,2);
    this.box(18,10,.15,this.mat.plaster,0,4.8,-1.7);
    this.box(.18,10,18,this.mat.plaster,-7,4.8,2);
    // Wall panel mouldings catch real light and anchor the cabinet in a room.
    for(const x of [-5.8,-4.2,4.2,5.8]){
      this.box(.035,4.6,.055,this.mat.dark,x,2.6,-1.58);
    }
    for(const x of [-5,5])for(const y of [.3,4.9])this.box(1.6,.035,.055,this.mat.dark,x,y,-1.58);
    this.box(18,.13,.17,this.mat.edge,0,.05,-1.55);
    this.box(6.8,.018,4.4,new THREE.MeshStandardMaterial({color:'#656b57',roughness:1}),0,-.059,3.4);
    for(const x of [-3.12,3.12])this.box(.035,.02,4.05,new THREE.MeshStandardMaterial({color:'#aea07b',roughness:1}),x,-.047,3.4);
    this.contact(0,-.045,-.35,8,3,.75);
  }

  buildCabinet(){
    const group=new THREE.Group();this.scene.add(group);this.cabinet=group;
    // Deep carcass, back panels and bevelled walnut joinery.
    this.box(6.5,4.8,.16,this.mat.wood,0,2.52,-1.42,group);
    for(const x of [-3.23,3.23])this.box(.22,4.94,1.18,this.mat.wood,x,2.54,-.91,group);
    for(const y of [.18,.51,1.9,3.4,4.99]){
      const d=y===.18?1.34:1.19;
      this.box(6.55,y===.18?.27:.15,d,this.mat.wood,0,y,-.9,group);
      this.box(6.67,.048,.065,this.mat.edge,0,y+.027,-.265,group);
    }
    this.box(6.83,.17,1.37,this.mat.wood,0,5.12,-.91,group);
    this.box(6.7,.052,1.31,this.mat.edge,0,5.025,-.91,group);
    for(const x of [-1.2,1.2])this.box(.105,4.37,1.08,this.mat.wood,x,2.73,-.98,group);
    for(const y of [1.81,3.31,4.9]){
      const strip=new THREE.MeshStandardMaterial({color:'#ffd49c',emissive:'#ffce88',emissiveIntensity:.8,roughness:.5});
      this.box(6.13,.025,.04,strip,0,y,-.37,group);
    }
    // Lower cabinet doors and small brass pulls.
    for(const x of [-2.13,0,2.13]){
      this.box(1.98,.94,.08,this.mat.wood,x,1.17,-.26,group);
      this.box(1.74,.71,.018,this.mat.edge,x,1.17,-.208,group);
      this.box(1.63,.6,.026,this.mat.wood,x,1.17,-.188,group);
      const pull=this.cylinder(.035,.035,.12,this.mat.brass,x+.64,1.26,-.08,group);pull.rotation.x=Math.PI/2;
    }
    const palettes=['#3b4b3d','#67573b','#51312d','#344349','#8b7654','#525640'];
    const labels=['阅读札记','主题文选','待续之卷','资料索引','历史与记忆','文献目录'];
    const placeSpines=(from,count,base,colors=0)=>{
      for(let i=0;i<count;i++){
        const width=.17+(i%3)*.042,height=1.02+(i%4)*.077;
        const b=this.closedBook(width,height,.66,palettes[(i+colors)%6],labels[(i+colors)%6]);
        b.position.set(from+i*.265,base+height/2,-.72);b.rotation.z=i===count-1?-.07:((i%3)-1)*.018;group.add(b);
      }
    };
    placeSpines(-2.94,6,1.99,0);placeSpines(1.55,5,1.99,2);
    placeSpines(-2.89,5,3.49,2);placeSpines(1.5,6,3.49,0);
    const stack=new THREE.Group();stack.position.set(-.25,3.56,-.82);group.add(stack);
    for(let i=0;i<3;i++){
      this.box(1.15,.045,.66,new THREE.MeshStandardMaterial({color:palettes[i+2],roughness:.6}),i*.06,i*.19,-i*.025,stack);
      this.box(1.1,.125,.61,this.mat.paper,i*.06,i*.19+.083,-i*.025,stack);
      this.box(1.15,.032,.66,new THREE.MeshStandardMaterial({color:palettes[i+2],roughness:.6}),i*.06,i*.19+.16,-i*.025,stack);
    }
    // A small globe gives the upper shelf readable spherical reflections.
    const globeGroup=new THREE.Group();globeGroup.position.set(.2,4.18,-.72);group.add(globeGroup);
    const globe=new THREE.Mesh(new THREE.SphereGeometry(.25,36,24),new THREE.MeshStandardMaterial({color:'#a19770',roughness:.67}));globe.castShadow=true;globeGroup.add(globe);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(.28,.009,10,64),this.mat.brass);ring.rotation.y=.3;ring.rotation.z=.3;globeGroup.add(ring);
    this.cylinder(.08,.11,.025,this.mat.brass,0,-.32,0,globeGroup);
    this.cylinder(.015,.015,.15,this.mat.brass,0,-.255,0,globeGroup);
    for(const y of [-.12,0,.12]){const line=new THREE.Mesh(new THREE.TorusGeometry(Math.sqrt(.25*.25-y*y),.002,4,48),this.mat.brass);line.rotation.x=Math.PI/2;line.position.y=y;globeGroup.add(line);}
    topics.forEach((entry,i)=>this.buildHeroBook(entry,(i-.5)*1.16));
    this.book=this.books.get(topic.id);this.coverHinge=this.book.userData.coverHinge;
    this.shelfBookPosition=this.book.userData.shelfPosition;
    this.shelfBookQuaternion=this.book.userData.shelfQuaternion;
    const plaqueMaterial=new THREE.MeshStandardMaterial({color:'#a88953',metalness:.7,roughness:.3});
    this.box(.52,.11,.014,plaqueMaterial,0,1.9,-.215,group);
  }

  closedBook(w,h,d,color,title){
    const group=new THREE.Group();
    const cloth=new THREE.MeshStandardMaterial({color,roughness:.65,bumpMap:this.clothMap,bumpScale:.01});
    const edge=new THREE.MeshStandardMaterial({map:pageEdges(),roughness:.9});
    this.box(w-.015,h-.05,d-.055,edge,0,0,-.016,group,.008);
    for(const x of [-w/2,w/2])this.box(.024,h,d,cloth,x,0,0,group,.008);
    const spine=this.box(w+.025,h,.045,cloth,0,0,d/2,group,.015);
    const face=this.plane(w,h,new THREE.MeshStandardMaterial({map:spineMap(title,color),roughness:.6}),0,0,d/2+.024,group);
    face.castShadow=false;
    for(const y of [-h*.35,h*.35])this.box(w+.03,.027,.05,cloth,0,y,d/2,group,.007);
    return group;
  }

  buildHeroBook(entry,shelfX){
    const group=new THREE.Group();this.scene.add(group);
    group.userData.action=`book:${entry.id}`;this.interactables.push(group);
    const w=.91,h=1.30,d=.23;
    this.box(w,h,.035,this.mat.leather,0,0,-d/2,group,.012);
    const edges=new THREE.MeshStandardMaterial({map:pageEdges(),roughness:.87});
    this.box(w-.045,h-.045,d-.034,edges,.009,0,0,group,.013);
    this.box(.045,h,d+.042,this.mat.leather,-w/2,0,0,group,.016);
    const page=this.plane(w-.06,h-.055,new THREE.MeshStandardMaterial({map:innerPage(false,entry),roughness:.9}),.01,0,d/2+.002,group);page.receiveShadow=true;
    const hinge=new THREE.Group();hinge.position.set(-w/2,0,d/2+.018);group.add(hinge);group.userData.coverHinge=hinge;
    this.box(w,h,.036,this.mat.leather,w/2,0,0,hinge,.012);
    const faceMaterial=new THREE.MeshStandardMaterial({map:bookFace(entry.shortTitle||entry.title,entry.id===topic.id?'#723c31':'#3d554d',true,entry.coverLine),roughness:.52,bumpMap:this.clothMap,bumpScale:.007,metalness:.04});
    this.plane(w-.005,h-.006,faceMaterial,w/2,0,.019,hinge);
    const inner=this.plane(w-.07,h-.06,new THREE.MeshStandardMaterial({map:innerPage(true,entry),roughness:.9}),w/2,0,-.019,hinge);inner.rotation.y=Math.PI;inner.receiveShadow=true;
    this.box(.043,.44,.007,new THREE.MeshStandardMaterial({color:'#804235',roughness:.9}),w*.19,-h*.36,d/2+.005,group,.003);
    group.userData.shelfPosition=new THREE.Vector3(shelfX,2.64,-.5);
    group.userData.shelfQuaternion=new THREE.Quaternion().setFromEuler(new THREE.Euler(0,-.12,-.025));
    this.deskBookPosition=new THREE.Vector3(.63,1.34,2.72);
    this.deskBookQuaternion=new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI/2,0,-.08));
    group.position.copy(group.userData.shelfPosition);group.quaternion.copy(group.userData.shelfQuaternion);
    this.books.set(entry.id,group);
    this.contact(shelfX,1.981,-.5,1.1,1,.55);
  }

  setTopic(id){
    if(!this.books.has(id)||this.topicId===id&&this.book)return;
    this.topicId=id;this.book=this.books.get(id);this.coverHinge=this.book.userData.coverHinge;
    this.shelfBookPosition=this.book.userData.shelfPosition;
    this.shelfBookQuaternion=this.book.userData.shelfQuaternion;
    for(const group of this.folderGroups){this.scene.remove(group);this.hoverAmounts.delete(group);this.interactables=this.interactables.filter(x=>x!==group);}
    this.folderGroups=[];this.buildFolders();
    this.applyBookPose(this.view);this.applyFolderPose(this.view,this.archiveCategory);
    this.invalidate();
  }

  buildDesk(){
    const group=new THREE.Group();this.scene.add(group);this.desk=group;
    this.box(5.5,.17,3.35,this.mat.desk,0,1.10,2.8,group,.05);
    this.box(5.35,.07,3.21,this.mat.edge,0,1.01,2.8,group,.02);
    for(const x of [-2.35,2.35])for(const z of [1.48,4.12]){
      const leg=this.box(.12,1.01,.12,this.mat.wood,x,.5,z,group,.02);leg.rotation.z=x>0?-.035:.035;
    }
    this.box(4.8,.22,.095,this.mat.wood,0,.94,4.07,group);
    this.contact(0,-.038,2.9,6,3.8,.55);
    // Leather writing pad, actual raised stitching around its edge.
    const pad=new THREE.MeshStandardMaterial({color:'#303d30',roughness:.86,bumpMap:this.clothMap,bumpScale:.005});
    this.box(3.6,.018,2.47,pad,-.02,1.195,2.76,group,.04);
    const stitch=new THREE.MeshStandardMaterial({color:'#a19673',roughness:.8});
    for(let x=-1.73;x<1.75;x+=.12){this.box(.045,.002,.006,stitch,x,1.206,1.57,group,.001);this.box(.045,.002,.006,stitch,x,1.206,3.96,group,.001);}
    this.contact(.02,1.212,2.75,3.7,2.65,.6,group);
    // Brass banker lamp with glass shade and a local pool of light.
    const lamp=new THREE.Group();lamp.position.set(2.07,1.195,1.71);group.add(lamp);
    this.cylinder(.26,.31,.055,this.mat.brass,0,.028,0,lamp);
    this.cylinder(.07,.16,.05,this.mat.brass,0,.074,0,lamp);
    this.cylinder(.023,.023,.8,this.mat.brass,0,.49,0,lamp);
    const arm=this.cylinder(.016,.016,.57,this.mat.brass,0,.89,0,lamp);arm.rotation.z=Math.PI/2;
    const shade=new THREE.Mesh(new THREE.CylinderGeometry(.23,.23,.72,40,1,true,0,Math.PI),this.mat.green);shade.rotation.z=Math.PI/2;shade.position.set(0,.97,0);shade.castShadow=true;lamp.add(shade);
    const cream=new THREE.MeshStandardMaterial({color:'#e4d8b5',emissive:'#ffd292',emissiveIntensity:.55,side:THREE.DoubleSide});
    const inside=new THREE.Mesh(new THREE.CylinderGeometry(.223,.223,.7,40,1,true,0,Math.PI),cream);inside.rotation.z=Math.PI/2;inside.position.copy(shade.position);lamp.add(inside);
    const lampLight=new THREE.PointLight('#ffe0a1',2.7,4,2);lampLight.position.set(0,.78,0);lamp.add(lampLight);
    this.contact(0,.001,0,.9,.6,.3,lamp);
    // Pen and a small ceramic cup: silhouettes and material contrast.
    const pen=new THREE.Group();pen.position.set(1.98,1.23,3.18);pen.rotation.y=-.3;group.add(pen);
    const body=this.cylinder(.024,.024,.78,this.mat.dark,0,0,0,pen);body.rotation.x=Math.PI/2;
    const tip=this.cylinder(0,.024,.12,this.mat.brass,0,0,.45,pen);tip.rotation.x=Math.PI/2;
    const cap=this.cylinder(.026,.026,.04,this.mat.brass,0,0,-.32,pen);cap.rotation.x=Math.PI/2;
    const porcelain=new THREE.MeshStandardMaterial({color:'#d0c4aa',roughness:.24});
    const cup=new THREE.Group();cup.position.set(-2.11,1.185,3.36);group.add(cup);
    this.cylinder(.24,.24,.028,porcelain,0,.02,0,cup);
    const vessel=this.cylinder(.16,.12,.27,porcelain,0,.16,0,cup);
    this.cylinder(.142,.142,.005,new THREE.MeshStandardMaterial({color:'#392619',roughness:.23}),0,.297,0,cup);
    const handle=new THREE.Mesh(new THREE.TorusGeometry(.085,.022,10,30),porcelain);handle.position.set(-.175,.17,0);cup.add(handle);
    this.contact(-2.11,1.187,3.36,.7,.65,.35,group);
  }

  buildFolders(){
    const categories=getCategories(this.topicId);
    categories.forEach((category,i)=>{
      const group=new THREE.Group();group.userData.action=category.id;this.scene.add(group);
      this.folderGroups.push(group);this.interactables.push(group);
      const base=new THREE.MeshStandardMaterial({color:['#ae8a50','#79825e','#a66f59'][i%3],roughness:.85});
      const w=1.08,h=.76;
      this.box(w,h,.022,base,0,0,0,group,.015);
      this.box(.38,.1,.022,base,-.29,h/2+.045,0,group,.015);
      const sheets=[];
      for(let n=0;n<3;n++){
        const sheet=new THREE.Group();group.add(sheet);
        this.box(.81,.65,.008,this.mat.paper,0,0,0,sheet,.002);
        const ink=new THREE.MeshStandardMaterial({color:'#ab9b7e',roughness:1});
        for(let line=0;line<4;line++)this.box(.47-line*.035,.003,.001,ink,-.09,.14-line*.07,.006,sheet,.001);
        sheets.push(sheet);
      }
      const hinge=new THREE.Group();hinge.position.set(0,-h/2,.046);group.add(hinge);
      this.box(w,h-.035,.018,base,0,h/2-.018,.012,hinge,.01);
      this.plane(w-.01,h-.045,new THREE.MeshStandardMaterial({map:folderFace(category,i),roughness:.83}),0,h/2-.018,.023,hinge);
      group.userData.frontHinge=hinge;group.userData.sheets=sheets;group.userData.sheetProgress=0;
      const offset=i-(categories.length-1)/2;
      group.userData.basePosition=new THREE.Vector3(offset*1.24,1.73+(offset===0?.07:0),2.58+(offset===0?-.08:.08));
      group.userData.baseRotation=new THREE.Euler(-1.06,0,offset*-.105);
      group.position.copy(group.userData.basePosition);group.rotation.copy(group.userData.baseRotation);
      group.visible=false;
    });
  }

  pose(view){
    const mobile=innerWidth<900;
    if(view==='shelf')return {position:vec(mobile?[.72,3.12,7.3]:[2.2,3.42,8.25]),look:vec(mobile?[0,2.75,-.56]:[0,2.49,-.65])};
    if(view==='archive')return {position:vec(mobile?[.3,6.2,6.1]:[1.4,5.45,6.1]),look:vec([0,1.9,3.0])};
    return {position:vec(mobile?[.45,6.4,6.1]:[2.55,5.4,6.0]),look:vec([0,1.25,2.7])};
  }

  setView(view,{animate=false,category=null}={}){
    const previous=this.view,previousCategory=this.archiveCategory;
    const folderFrom=this.folderGroups.map(group=>({position:group.position.clone(),quaternion:group.quaternion.clone(),scale:group.scale.x,front:group.userData.frontHinge.rotation.x,sheets:group.userData.sheetProgress}));
    this.view=view;this.archiveCategory=view==='archive'?category:null;this.hovered=null;this.pointerGoal.set(0,0);
    const destination=this.pose(view);
    const useMotion=animate&&!this.reduced()&&(previous!==view||previousCategory!==this.archiveCategory);
    this.camera.fov=innerWidth<900?(view==='shelf'?43:(innerWidth<500?68:50)):39;this.camera.updateProjectionMatrix();
    if(useMotion){
      this.tween={start:performance.now(),duration:previous==='shelf'&&view==='desk'?3300:previous==='desk'&&view==='archive'?1900:previous==='archive'&&view==='desk'?1350:1200,from:previous,to:view,cameraFrom:this.camera.position.clone(),lookFrom:this.look.clone(),bookFrom:this.book.position.clone(),quaternionFrom:this.book.quaternion.clone(),scaleFrom:this.book.scale.x,openFrom:this.coverHinge.rotation.y,folderFrom};
      document.body.classList.add('room-travelling');
      document.body.classList.toggle('folder-opening',previous==='desk'&&view==='archive');
      document.body.classList.toggle('folder-closing',previous==='archive'&&view==='desk');
    }else{
      this.tween=null;document.body.classList.remove('room-travelling','folder-opening','folder-closing','folder-reveal');
      this.camera.position.copy(destination.position);this.look.copy(destination.look);
      this.applyBookPose(view);this.applyFolderPose(view,this.archiveCategory);
    }
    this.canvas.dataset.view=view;this.canvas.dataset.folderState=view==='archive'?(useMotion?'opening':'open'):useMotion&&previous==='archive'?'closing':'closed';this.canvas.dataset.settled='false';this.canvas.dataset.ready='false';
    this.renderer.shadowMap.needsUpdate=true;this.invalidate();
  }

  applyBookPose(view){
    const shelf=view==='shelf';
    for(const group of this.books.values()){
      const active=group===this.book;
      group.position.copy(!active||shelf?group.userData.shelfPosition:this.deskBookPosition);
      group.quaternion.copy(!active||shelf?group.userData.shelfQuaternion:this.deskBookQuaternion);
      group.scale.setScalar(!active||shelf?1:1.46);
      group.userData.coverHinge.rotation.y=!active||shelf?0:-Math.PI+.065;
    }
  }

  folderTarget(group,i,view,category){
    const compact=innerWidth<500,position=group.userData.basePosition.clone();
    position.x*=compact?.9:1;
    if(view==='shelf')return {position:position.add(new THREE.Vector3(0,-.25,0)),quaternion:new THREE.Quaternion().setFromEuler(group.userData.baseRotation),scale:.001,front:0,sheets:0};
    if(view==='archive'&&group.userData.action===category){
      return {position:vec(compact?[0,1.82,3.18]:[0,1.95,3.22]),quaternion:new THREE.Quaternion().setFromEuler(new THREE.Euler(compact?-.94:-.8,0,0)),scale:compact?1.23:1.48,front:1.58,sheets:1};
    }
    if(view==='archive')return {position,quaternion:new THREE.Quaternion().setFromEuler(group.userData.baseRotation),scale:.001,front:0,sheets:0};
    return {position,quaternion:new THREE.Quaternion().setFromEuler(group.userData.baseRotation),scale:compact?.88:1,front:0,sheets:0};
  }

  placeSheets(group,progress){
    group.userData.sheetProgress=progress;
    group.userData.sheets.forEach((sheet,i)=>{
      sheet.position.set((i-1)*.015+progress*(i-1)*.1,-.055+progress*(.23+i*.055),.026+i*.012+progress*.045);
      sheet.rotation.z=progress*(i-1)*.13;
    });
  }

  applyFolderPose(view,category){
    this.folderGroups.forEach((group,i)=>{
      const target=this.folderTarget(group,i,view,category);
      group.position.copy(target.position);group.quaternion.copy(target.quaternion);group.scale.setScalar(target.scale);
      group.userData.frontHinge.rotation.x=target.front;this.placeSheets(group,target.sheets);
      group.visible=target.scale>.01;
    });
  }

  animateFolders(tween,t){
    const entering=tween.from==='desk'&&tween.to==='archive';
    const leaving=tween.from==='archive'&&tween.to==='desk';
    const travel=smooth(entering?(t-.04)/.67:leaving?(t-.18)/.8:tween.from==='shelf'&&tween.to==='desk'?(t-.81)/.19:t);
    const opening=smooth(entering?(t-.37)/.55:leaving?t/.62:travel);
    const paper=smooth(entering?(t-.57)/.36:leaving?t/.5:travel);
    this.folderGroups.forEach((group,i)=>{
      const from=tween.folderFrom[i],target=this.folderTarget(group,i,tween.to,this.archiveCategory);
      group.position.lerpVectors(from.position,target.position,travel);
      group.quaternion.slerpQuaternions(from.quaternion,target.quaternion,travel);
      group.scale.setScalar(mix(from.scale,target.scale,travel));
      group.userData.frontHinge.rotation.x=mix(from.front,target.front,opening);
      this.placeSheets(group,mix(from.sheets,target.sheets,paper));
      group.visible=group.scale.x>.01;
    });
  }

  bindEvents(){
    this.canvas.addEventListener('pointermove',e=>{
      this.pointer.set(e.clientX/innerWidth*2-1,-e.clientY/innerHeight*2+1);
      this.pointerGoal.set(this.pointer.x,this.pointer.y);this.pick();this.invalidate();
    });
    this.canvas.addEventListener('pointerleave',()=>{this.hovered=null;this.pointerGoal.set(0,0);this.canvas.style.cursor='default';this.invalidate();});
    this.canvas.addEventListener('click',e=>{
      if(this.tween)return;
      this.pointer.set(e.clientX/innerWidth*2-1,-e.clientY/innerHeight*2+1);this.pick();
      if(this.hovered)this.onActivate?.(this.hovered.userData.action);
    });
    this.canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();document.body.classList.add('renderer-failed');this.canvas.dataset.failed='true';});
    this.canvas.addEventListener('webglcontextrestored',()=>location.reload());
    window.addEventListener('resize',this.resize);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)this.invalidate();});
  }

  pick(){
    if(this.tween||!['shelf','desk'].includes(this.view)){this.hovered=null;return;}
    this.raycaster.setFromCamera(this.pointer,this.camera);
    const candidates=this.view==='shelf'?[...this.books.values()]:this.folderGroups.filter(g=>g.visible);
    const hit=this.raycaster.intersectObjects(candidates,true)[0];
    let object=hit?.object;
    while(object&&!object.userData.action)object=object.parent;
    this.hovered=object||null;this.canvas.style.cursor=object?'pointer':'default';
    this.canvas.dataset.hoveredAction=object?.userData.action||'';
  }

  updateHotspots(){
    const anchors={};
    for(const [id,group] of this.books)anchors[id]=group.localToWorld(new THREE.Vector3(0,-.76,.15));
    this.folderGroups.forEach(group=>{anchors[group.userData.action]=group.localToWorld(new THREE.Vector3(0,-.57,.08));});
    for(const el of document.querySelectorAll('[data-world-anchor]')){
      const point=anchors[el.dataset.worldAnchor];if(!point)continue;
      const projected=point.clone().project(this.camera);
      el.style.left=`${(projected.x*.5+.5)*innerWidth}px`;
      el.style.top=`${(-projected.y*.5+.5)*innerHeight}px`;
      el.style.visibility=this.tween||projected.z>1?'hidden':'visible';
    }
  }

  invalidate(){if(!this.frame&&!document.hidden)this.frame=requestAnimationFrame(t=>this.draw(t));}
  draw(now){
    this.frame=0;let again=false;
    const target=this.pose(this.view);
    if(this.tween){
      const a=this.tween,t=clamp((now-a.start)/a.duration,0,1),cinematic=a.from==='shelf'&&a.to==='desk';
      const cameraT=smooth(cinematic?(t-.12)/.69:t);
      this.camera.position.lerpVectors(a.cameraFrom,target.position,cameraT);
      this.look.lerpVectors(a.lookFrom,target.look,cameraT);
      const shelf=this.view==='shelf';
      const bookT=smooth(cinematic?(t-.18)/.59:t);
      const endpoint=shelf?this.shelfBookPosition:this.deskBookPosition;
      this.book.position.lerpVectors(a.bookFrom,endpoint,bookT);
      if(cinematic){this.book.position.z+=Math.sin(Math.PI*clamp(t/.74,0,1))*.85;this.book.position.y+=Math.sin(bookT*Math.PI)*.8;}
      this.book.quaternion.slerpQuaternions(a.quaternionFrom,shelf?this.shelfBookQuaternion:this.deskBookQuaternion,bookT);
      this.book.scale.setScalar(mix(a.scaleFrom,shelf?1:1.46,bookT));
      const openT=smooth(cinematic?(t-.7)/.23:t);
      this.coverHinge.rotation.y=mix(a.openFrom,shelf?0:-Math.PI+.065,openT);
      this.animateFolders(a,t);
      if(document.body.classList.contains('folder-opening'))document.body.classList.toggle('folder-reveal',t>.72);
      this.renderer.shadowMap.needsUpdate=true;
      if(t===1){this.tween=null;this.applyBookPose(this.view);this.applyFolderPose(this.view,this.archiveCategory);document.body.classList.remove('room-travelling','folder-opening','folder-closing','folder-reveal');this.canvas.dataset.folderState=this.view==='archive'?'open':'closed';this.canvas.dataset.settled='true';}else again=true;
    }else{
      const goal=this.reduced()?new THREE.Vector2():this.pointerGoal;
      this.parallax.lerp(goal,.075);
      const scale=this.view==='shelf'?.10:.035;
      this.camera.position.copy(target.position).add(new THREE.Vector3(this.parallax.x*scale,this.parallax.y*scale,0));this.look.copy(target.look);
      if(this.parallax.distanceTo(goal)>.001)again=true;
      const candidates=this.view==='shelf'?[...this.books.values()]:this.view==='desk'?this.folderGroups:[];
      for(const group of candidates){
        const old=this.hoverAmounts.get(group)||0;
        const desired=group===this.hovered&&!this.reduced()?1:0;
        const n=mix(old,desired,.12);this.hoverAmounts.set(group,n);
        if(this.books.has(group.userData.action?.slice(5))){group.position.copy(group.userData.shelfPosition);group.position.z+=n*.18;group.position.y+=n*.035;}
        else {group.position.copy(group.userData.basePosition);group.position.x*=innerWidth<500?.9:1;group.scale.setScalar(innerWidth<500?.88:1);group.position.y+=n*.12;}
        if(Math.abs(n-desired)>.001){again=true;this.renderer.shadowMap.needsUpdate=true;}
      }
    }
    this.camera.lookAt(this.look);this.scene.updateMatrixWorld(true);
    this.camera.updateMatrixWorld();this.updateHotspots();this.renderer.render(this.scene,this.camera);
    this.canvas.dataset.ready='true';if(!this.tween)this.canvas.dataset.settled='true';
    this.canvas.dataset.drawCalls=String(this.renderer.info.render.calls);
    if(again)this.invalidate();
  }
}
