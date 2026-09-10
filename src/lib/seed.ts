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
  ['The Marigold Collective','Decoration & Florists','Kochi',35000,photos.decor,'Thoughtful florals and beautiful details for celebrations that feel like you.'],
  ['Frame & Fable','Photography & Media','Kochi',45000,photos.photo,'Honest moments, artfully captured. Wedding and celebration photography.'],
  ['Saffron Table','Catering & Food','Thrissur',650,photos.food,'Seasonal menus, warm hospitality, and food that brings people together.'],
  ['The Palm Courtyard','Venues & Accommodation','Kozhikode',80000,photos.venue,'An intimate, light-filled setting for your most meaningful gatherings.'],
  ['Evergreen Celebrations','Event Planning & Management','Kochi',25000,photos.hero,'From the first idea to the final detail, a celebration planned around you.'],
  ['Petal & Stem','Decoration & Florists','Thrissur',20000,photos.decor,'Fresh flowers, natural textures, and a little everyday magic.'],
  ['Little Light Studio','Photography & Media','Kozhikode',30000,photos.photo,'A relaxed approach to documenting your once-in-a-lifetime moments.'],
  ['Gather & Graze','Catering & Food','Kochi',850,photos.food,'Beautifully presented feasts for intimate parties and grand occasions.'],
] as const;
const categories = [
  ['Event Planning & Management',['Wedding planners','Event planners','Corporate event managers','Birthday party planners','Conference organisers','Church and worship-event organisers','Event coordinators'],1],
  ['Venues & Accommodation',['Hotels and resorts','Banquet and wedding halls','Conference halls','Community halls','Guesthouses and homestays','Outdoor venues','Farmhouses and campsites'],1],
  ['Sound, Lighting & Stage',['Sound-system providers','Lighting providers','LED-wall providers','Stage and truss providers','Generator providers','Special-effects providers','DJ equipment providers','Sound and lighting dealers'],1],
  ['Decoration & Florists',['Wedding and event decorators','Florists','Balloon decorators','Theme decorators','Entrance and backdrop designers','Mandap decorators','Church decorators'],1],
  ['Catering & Food',['Caterers','Restaurants','Bakers and cake designers','Snack and dessert vendors','Beverage providers','Live food-stall providers','Bartending services'],1],
  ['Photography & Media',['Photographers','Videographers','Wedding filmmakers','Drone operators','Photo-booth providers','Live-streaming teams','Video editors','Social-media coverage teams'],1],
  ['Makeup, Fashion & Styling',['Makeup artists','Hairstylists','Bridal-wear designers','Groom-wear designers','Fashion designers and boutiques','Jewellery providers','Clothing and accessory rentals','Personal stylists'],1],
  ['Artists & Entertainment',['Singers and bands','DJs and musicians','Dancers','Anchors and emcees','Comedians','Magicians','Cultural performers','Artist-management agencies'],1],
  ['Tent, Furniture & Equipment Rentals',['Tent houses','Table and chair rentals','Sofa and lounge rentals','Canopy providers','Cooling and heating equipment rentals','Carpet and furnishing rentals','Kitchen-equipment rentals','Portable washroom providers'],1],
  ['Invitations, Printing & Gifts',['Invitation-card designers','Printing businesses','Digital invitation designers','Signage and banner printers','Gift and hamper providers','Wedding-favour vendors','Trophy and certificate providers','Personalised merchandise businesses'],2],
  ['Transportation & Logistics',['Wedding-car rentals','Bus and traveller rentals','Taxi services','Luxury-car providers','Logistics providers','Equipment-transport providers','Valet-parking services'],2],
  ['Event Support Services',['Security agencies','Bouncers','Ushers and event staff','Cleaning services','Electricians','Event insurance providers','First-aid and ambulance services','Technical-support teams'],2],
] as const;
const defaultService:Record<string,string>={
  'Decoration & Florists':'Wedding and event decorators','Photography & Media':'Photographers','Catering & Food':'Caterers','Venues & Accommodation':'Banquet and wedding halls','Event Planning & Management':'Wedding planners'
};
export function initialState():State { return {
  vendors:specs.map((s,i):Vendor=>({id:`sample-${i+1}`,userId:'',name:s[0],slug:slugify(s[0]),owner:'Sample business',category:s[1],service:defaultService[s[1]]||s[1],city:s[2],locations:[s[2]],experience:5+i,description:s[5]+' This is an illustrative listing created to preview the Occanova experience. Replace it with an approved, real vendor before launch.',summary:s[5],price:s[3],phone:'',whatsapp:'',email:'',image:s[4],gallery:[s[4],photos.hero],documents:[],status:'approved',published:true,featured:i<3,priority:i+1,featuredStart:'',featuredEnd:'',remarks:'',sample:true})),
  categories:categories.map(([name,services,phase],position)=>({name,slug:slugify(name),active:phase===1,services:[...services],phase,position:position+1})),
  locations:['Kochi','Thrissur','Kozhikode'].map((name,position)=>({name,slug:slugify(name),active:true,position:position+1})),
  users:[],enquiries:[],sessions:[],tokens:[],audit:[],
}; }
