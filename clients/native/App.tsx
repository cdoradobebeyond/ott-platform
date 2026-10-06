import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ImageBackground, Linking, Platform, Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { VdoPlayerView } from 'vdocipher-rn-bridge';
import { fetchPublished, getPlayback, heartbeatPlayback, releasePlayback, supabase } from './src/supabase';
import { installationId } from './src/device';

const red = '#d94c43';
const demoArt = require('./assets/festejo-hero.png');
const sample = [
  { vdocipher_id:'demo-live', title:'Feria de San Isidro · Madrid', genre:'DIRECTO · LAS VENTAS', poster_image:demoArt, duration_seconds:0 },
  { vdocipher_id:'demo-madrid', title:'La tarde de los sueños', genre:'MADRID · 2025', poster_image:demoArt, duration_seconds:8040 },
  { vdocipher_id:'demo-sevilla', title:'Sevilla: una feria para el recuerdo', genre:'SEVILLA · 2025', poster_image:demoArt, duration_seconds:9120 },
  { vdocipher_id:'demo-serie', title:'El arte de la faena', genre:'SERIE ORIGINAL · 2025', poster_url:'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=85', duration_seconds:2880 },
];

export default function App() {
  const { width } = useWindowDimensions();
  const isTV = Boolean(Platform.isTV);
  const platform = isTV ? (Platform.isTVOS ? 'tvos' : 'androidtv') : Platform.OS;
  const [session,setSession] = useState<any>(null);
  const [titles,setTitles] = useState<any[]>(sample);
  const [selected,setSelected] = useState<any>(null);
  const [embed,setEmbed] = useState<any>(null);
  const [loading,setLoading] = useState(false);
  const [message,setMessage] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({data}) => setSession(data.session));
    const {data:{subscription}} = supabase.auth.onAuthStateChange((_event,next) => setSession(next));
    const completeOAuth=async(url:string)=>{if(!url.includes('auth/callback'))return;const {error}=await supabase.auth.exchangeCodeForSession(url);if(error)setMessage(error.message);};
    const linking=Linking.addEventListener('url',event=>{void completeOAuth(event.url)});
    Linking.getInitialURL().then(url=>{if(url)void completeOAuth(url)});
    fetchPublished(platform).then(items => { if (items.length) setTitles(items); }).catch(() => {});
    return () => {subscription.unsubscribe();linking.remove()};
  }, [platform]);

  useEffect(() => {
    if (!embed) return;
    let id = '';
    let timer: ReturnType<typeof setInterval> | undefined;
    let cancelled=false;
    installationId().then(value => { if(cancelled){void releasePlayback(value);return;} id=value; timer=setInterval(() => heartbeatPlayback(value).catch(()=>{}),30000); });
    return () => { cancelled=true; if(timer)clearInterval(timer); if(id) void releasePlayback(id); };
  }, [embed]);

  const signIn = async () => {
    const redirectTo='umbral://auth/callback';
    try {
      const {data,error}=await supabase.auth.signInWithOAuth({provider:'google',options:{redirectTo,skipBrowserRedirect:true}});
      if(error||!data.url)throw error||new Error('No se pudo iniciar OAuth.');
      await Linking.openURL(data.url);
    } catch(error:any){setMessage(error?.message||'No se pudo completar el inicio de sesión.');}
  };
  const play = async (item:any) => {
    if(String(item.vdocipher_id).startsWith('demo-')){setMessage('Este contenido es de muestra. Configura Supabase y publica un vídeo de VdoCipher para reproducirlo.');return;}
    if (!session) { await signIn(); return; }
    setSelected(item); setLoading(true); setMessage('');
    try {
      const device = await installationId();
      const credentials = await getPlayback(item.vdocipher_id,device);
      setEmbed({ otp:credentials.otp, playbackInfo:credentials.playbackInfo, customerType:credentials.customerType, deviceLimit:credentials.deviceLimit });
    } catch (error:any) { setMessage(error?.message || 'No se pudo iniciar la reproducción.'); setSelected(null); }
    finally { setLoading(false); }
  };
  const exitPlayer = () => { setEmbed(null); setSelected(null); };
  const tileWidth = isTV ? 255 : (width-54)/2;

  return <SafeAreaView style={s.root}><StatusBar barStyle="light-content" backgroundColor="#090a0c"/>
    <View style={[s.header,isTV&&s.headerTV]}><Text style={s.brand}>◉ UMBRAL<Text style={s.tv}> TV</Text></Text><View style={s.nav}>{['Inicio','En directo','A la carta','Programas'].map((n,i)=><Text key={n} style={[s.navItem,i===0&&s.navActive]}>{n}</Text>)}</View><Pressable onPress={signIn} style={s.login}><Text style={s.loginText}>{session?'MI CUENTA':'INICIAR SESIÓN'}</Text></Pressable></View>
    {embed ? <View style={s.player}><View style={s.playerHead}><Pressable onPress={exitPlayer}><Text style={s.back}>‹  Volver</Text></Pressable><Text style={s.playerTitle}>{selected?.title}</Text><Text style={s.live}>● DIRECTO</Text></View><VdoPlayerView style={s.video} embedInfo={{otp:embed.otp,playbackInfo:embed.playbackInfo}} showNativeControls autoPlay/><Text style={s.playerNote}>Sesión protegida · {embed.deviceLimit} dispositivo{embed.deviceLimit===1?'':'s'} concurrente{embed.deviceLimit===1?'':'s'}</Text></View> : <ScrollView style={s.scroll} contentContainerStyle={s.page}>
      <ImageBackground source={demoArt} imageStyle={s.heroImage} style={[s.hero,isTV&&s.heroTV]}><View style={s.heroShade}/><View style={s.heroText}><Text style={s.badge}>●  PRÓXIMO DIRECTO</Text><Text style={[s.kicker,isTV&&s.kickerTV]}>SÁBADO · 18:30 · LAS VENTAS</Text><Text style={[s.heroTitle,isTV&&s.heroTitleTV]}>LA EMOCIÓN{ '\n' }VUELVE A MADRID</Text><Text style={s.subtitle}>Vive cada pase, cada instante y toda la pasión de la Feria de San Isidro.</Text><Pressable style={s.primary} onPress={()=>play(titles[0])}><Text style={s.primaryText}>▶  Ver festejo</Text></Pressable></View></ImageBackground>
      <View style={s.liveStrip}><Text style={s.live}>● EN DIRECTO</Text><View style={{flex:1}}><Text style={s.liveTitle}>Canal Umbral</Text><Text style={s.muted}>La televisión taurina · Programación 24 h</Text></View><Pressable onPress={()=>play(titles[0])}><Text style={s.link}>Ver canal  ›</Text></Pressable></View>
      <Text style={[s.section,isTV&&s.sectionTV]}>En cartelera</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.rail}>{titles.map((item,i)=><Pressable key={item.vdocipher_id} onPress={()=>play(item)} style={({focused,pressed}:any)=>[s.card,{width:tileWidth},(focused||pressed)&&s.focused]}><ImageBackground source={item.poster_image||(item.poster_url?{uri:item.poster_url}:demoArt)} style={[s.poster,{height:isTV?170:width*.42}]} imageStyle={s.posterImage}><View style={s.posterShade}/><Text style={s.cardIndex}>{String(i+1).padStart(2,'0')}</Text><Text style={[s.duration,i===0&&s.durationLive]}>{i===0?'EN DIRECTO':`${Math.max(1,Math.round((item.duration_seconds||5400)/60))} MIN`}</Text></ImageBackground><Text numberOfLines={1} style={s.cardTitle}>{item.title}</Text><Text numberOfLines={1} style={s.cardSub}>{item.genre}</Text></Pressable>)}</ScrollView>
      <Text style={[s.section,isTV&&s.sectionTV]}>Festejos para volver a vivir</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.rail}>{titles.slice().reverse().map((item,i)=><Pressable key={`re-${item.vdocipher_id}`} onPress={()=>play(item)} style={({focused,pressed}:any)=>[s.card,{width:tileWidth},(focused||pressed)&&s.focused]}><ImageBackground source={item.poster_image||(item.poster_url?{uri:item.poster_url}:demoArt)} style={[s.poster,{height:isTV?170:width*.42}]} imageStyle={s.posterImage}><View style={s.posterShade}/><Text style={s.cardIndex}>{String(i+1).padStart(2,'0')}</Text><Text style={s.duration}>{item.genre}</Text></ImageBackground><Text numberOfLines={1} style={s.cardTitle}>{item.title}</Text><Text style={s.cardSub}>FESTEJO COMPLETO</Text></Pressable>)}</ScrollView>
      <View style={[s.editorial,isTV&&s.editorialTV]}><Text style={s.kicker}>UMBRAL · CONTENIDO ORIGINAL</Text><Text style={s.edTitle}>El arte está en cada detalle.</Text><Text style={s.muted}>Festejos, historias y voces que mantienen viva la pasión.</Text></View>
      {!!message&&<Text style={s.error}>{message}</Text>}
    </ScrollView>}
    {loading&&<View style={s.loading}><ActivityIndicator color={red}/><Text style={s.muted}>Preparando reproducción segura…</Text></View>}
  </SafeAreaView>;
}

const s=StyleSheet.create({root:{flex:1,backgroundColor:'#090a0c'},header:{height:60,paddingHorizontal:18,flexDirection:'row',alignItems:'center',borderBottomWidth:1,borderBottomColor:'#ffffff18'},headerTV:{height:74,paddingHorizontal:54},brand:{color:'#f4f1ec',fontSize:17,fontWeight:'900',letterSpacing:1.8},tv:{color:red,fontSize:10,letterSpacing:2},nav:{flex:1,flexDirection:'row',justifyContent:'center',gap:26},navItem:{color:'#a7a5a1',fontSize:12},navActive:{color:'#fff'},login:{borderWidth:1,borderColor:'#ffffff48',paddingHorizontal:12,paddingVertical:8,borderRadius:3},loginText:{color:'#fff',fontSize:9,fontWeight:'700',letterSpacing:.5},scroll:{flex:1},page:{paddingBottom:40},hero:{height:480,justifyContent:'flex-end',padding:24,overflow:'hidden'},heroTV:{height:560,paddingHorizontal:74,paddingBottom:63},heroImage:{resizeMode:'cover',opacity:.9},heroShade:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(5,6,8,0.5)'},heroText:{maxWidth:610},badge:{alignSelf:'flex-start',overflow:'hidden',backgroundColor:'#c6443b',color:'#fff',paddingHorizontal:9,paddingVertical:7,fontSize:9,fontWeight:'800',letterSpacing:1},kicker:{color:'#dfd9d1',fontSize:9,letterSpacing:1.7,marginTop:18,marginBottom:9},kickerTV:{fontSize:11},heroTitle:{color:'#fff',fontSize:42,lineHeight:43,fontWeight:'900',letterSpacing:-1.8},heroTitleTV:{fontSize:61,lineHeight:63},subtitle:{color:'#d1ceca',fontSize:11,lineHeight:18,maxWidth:360,marginTop:9},primary:{alignSelf:'flex-start',backgroundColor:red,paddingHorizontal:16,paddingVertical:12,borderRadius:3,marginTop:19},primaryText:{color:'#fff',fontSize:10,fontWeight:'800'},liveStrip:{height:65,backgroundColor:'#151619',marginHorizontal:18,marginTop:8,paddingHorizontal:13,flexDirection:'row',alignItems:'center',gap:12,borderWidth:1,borderColor:'#ffffff13'},live:{color:'#ef5e55',fontSize:8,fontWeight:'800',letterSpacing:1},liveTitle:{color:'#fff',fontSize:11,fontWeight:'700'},muted:{color:'#aaa7a2',fontSize:9,marginTop:4},link:{color:'#f2eeea',fontSize:9},section:{color:'#f3f1ed',fontWeight:'700',fontSize:16,marginTop:26,marginHorizontal:18,marginBottom:12},sectionTV:{fontSize:20,marginHorizontal:54,marginTop:32},rail:{paddingHorizontal:18,gap:12},card:{marginBottom:4},focused:{transform:[{scale:1.04}],borderWidth:2,borderColor:'#ef695f',borderRadius:3},poster:{justifyContent:'space-between',padding:9,overflow:'hidden'},posterImage:{resizeMode:'cover'},posterShade:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(4,5,8,0.14)'},cardIndex:{color:'#fff',fontSize:10,fontWeight:'800',textShadowColor:'#000',textShadowRadius:5},duration:{alignSelf:'flex-start',backgroundColor:'#101114dd',color:'#fff',fontSize:7,fontWeight:'800',paddingHorizontal:6,paddingVertical:5},durationLive:{backgroundColor:red},cardTitle:{color:'#eee',fontSize:10,fontWeight:'700',marginTop:8},cardSub:{color:'#97938e',fontSize:8,marginTop:4,letterSpacing:.6},editorial:{marginHorizontal:18,marginTop:30,backgroundColor:'#2b1b1d',borderLeftWidth:3,borderLeftColor:red,padding:19},editorialTV:{marginHorizontal:54,padding:28},edTitle:{color:'#fff',fontSize:22,fontWeight:'700',marginTop:7},player:{flex:1,backgroundColor:'#000',padding:10},playerHead:{height:48,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},back:{color:'#fff',fontSize:12},playerTitle:{color:'#fff',fontSize:12,fontWeight:'700'},playerNote:{color:'#aaa',fontSize:9,textAlign:'center',margin:10},video:{width:'100%',height:'78%',alignSelf:'center',backgroundColor:'#000'},loading:{position:'absolute',bottom:20,alignSelf:'center',padding:12,backgroundColor:'#242427',flexDirection:'row',gap:9,alignItems:'center'},error:{color:'#ffaaa4',marginHorizontal:20,marginTop:15,fontSize:10}});
