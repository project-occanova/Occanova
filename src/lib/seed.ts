import type { State, Vendor } from './types';
import { slugify } from './directory';
export const photos = {
  hero:'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1800&q=85',
  decor:'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=900&q=85',
  photo:'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=900&q=85',
  food:'https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=900&q=85',
  venue:'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=900&q=85',
};
const specs = [
  ['The Marigold Collective','Decor & Styling','Kochi',35000,photos.decor,'Thoughtful florals and beautiful details for celebrations that feel like you.'],
  ['Frame & Fable','Photography','Kochi',45000,photos.photo,'Honest moments, artfully captured. Wedding and celebration photography.'],
  ['Saffron Table','Catering','Thrissur',650,photos.food,'Seasonal menus, warm hospitality, and food that brings people together.'],
  ['The Palm Courtyard','Venues','Kozhikode',80000,photos.venue,'An intimate, light-filled setting for your most meaningful gatherings.'],
  ['Evergreen Celebrations','Event Planners','Kochi',25000,photos.hero,'From the first idea to the final detail, a celebration planned around you.'],
  ['Petal & Stem','Decor & Styling','Thrissur',20000,photos.decor,'Fresh flowers, natural textures, and a little everyday magic.'],
  ['Little Light Studio','Photography','Kozhikode',30000,photos.photo,'A relaxed approach to documenting your once-in-a-lifetime moments.'],
  ['Gather & Graze','Catering','Kochi',850,photos.food,'Beautifully presented feasts for intimate parties and grand occasions.'],
] as const;
export function initialState():State { return {
  vendors:specs.map((s,i):Vendor=>({id:`sample-${i+1}`,userId:'',name:s[0],slug:slugify(s[0]),owner:'Sample business',category:s[1],city:s[2],locations:[s[2]],experience:5+i,description:s[5]+' This is an illustrative listing created to preview the Occanova experience. Replace it with an approved, real vendor before launch.',summary:s[5],price:s[3],phone:'',whatsapp:'',email:'',image:s[4],gallery:[s[4],photos.hero],status:'approved',published:true,featured:i<3,priority:i+1,featuredStart:'',featuredEnd:'',remarks:'',sample:true})),
  categories:['Venues','Photography','Catering','Decor & Styling','Event Planners','Makeup & Beauty','Music & Entertainment'].map(name=>({name,slug:slugify(name),active:true})),
  locations:['Kochi','Thrissur','Kozhikode'].map(name=>({name,slug:slugify(name),active:true})),
  users:[],enquiries:[],sessions:[],tokens:[],audit:[],
}; }
