export type SpecRow = { label: string; value: string };

export type ProductGender = 'MEN' | 'WOMEN' | 'UNISEX';

export type Product = {
  id: string;
  title: string;
  brand: string;
  category: string;
  gender?: ProductGender;
  price: string;
  price_num?: number | null;
  image: string;
  affiliateUrl: string;
  description: string;
  color: string;
  fit: string;
  style: string;
  neck: string;
  sleeve: string;
  pattern: string;
  material: string;
  care: string;
  closure: string;
  country: string;
  asin: string;
  model: string;
  rank: string;
  pockets: string;
  season: string;
  occasion: string;
  specs: SpecRow[];
  sourceText?: string;
  published?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type UserRole = 'USER' | 'ADMIN';

export type User = {
  id: string;
  email: string;
  name?: string | null;
  role: UserRole;
  account_status: string;
  created_at?: string;
  updated_at?: string;
};

export type UserPreferences = {
  id: string;
  user_id: string;
  gender?: ProductGender;
  occasion?: string;
  style_direction?: string;
  preferred_color?: string;
  budget?: string;
  skin_tone?: string;
  preferences?: string[];
  created_at?: string;
  updated_at?: string;
};

export type SiteEvent = {
  id?: number;
  event_type: 'visit' | 'page_view' | 'product_view' | 'affiliate_click' | 'recommendation_run' | 'sign_in' | 'sign_up';
  product_id?: string | null;
  session_id?: string | null;
  user_id?: string | null;
  path?: string | null;
  metadata?: Record<string, any>;
  created_at?: string;
};

export type AuditLog = {
  id?: number;
  actor_id?: string | null;
  actor_email?: string | null;
  action: string;
  target_resource?: string | null;
  outcome: 'SUCCESS' | 'DENIED' | 'ERROR';
  details?: Record<string, any>;
  created_at?: string;
};

export const initialProducts: Product[] = [
  {
    id: 'jack-jones-12290084-mid-blue',
    title: 'Classic Mid Blue Regular Fit Shirt',
    brand: 'JACK & JONES',
    category: "Men's Shirts",
    gender: 'MEN',
    price: 'See latest price on Amazon',
    image: '/products/jack-jones-mid-blue.png',
    affiliateUrl: 'https://link.amazon/B0cWbrp7g',
    description:
      'A clean, versatile mid-blue shirt with a classic collared silhouette, long sleeves and a regular fit. A simple everyday layer that works with denim, trousers or smart-casual looks.',
    color: 'Mid Blue',
    fit: 'Regular Fit',
    style: 'Classic',
    neck: 'Collared Neck',
    sleeve: 'Long Sleeve',
    pattern: 'Solid',
    material: '95% Cotton, 5% Cotton - recycled',
    care: 'Machine Wash',
    closure: 'Button',
    country: 'Bangladesh',
    asin: 'B0GX61Z4R9',
    model: '12290084',
    rank: '#14,553 Clothing & Accessories • #642 Men’s Shirts',
    pockets: '1',
    season: 'All-Season',
    occasion: 'Casual',
    published: true,
    specs: [
      { label: 'Colour', value: 'Mid Blue' },
      { label: 'Fitting type', value: 'Regular Fit' },
      { label: 'Style Name', value: 'Classic' },
      { label: 'Neck Style', value: 'Collared Neck' },
      { label: 'Sleeve Type', value: 'Long Sleeve' },
      { label: 'Shirt Form Type', value: 'Tuxedo Shirt' },
      { label: 'Collar Style', value: 'Spread Collar' },
      { label: 'Pattern', value: 'Solid' },
      { label: 'Apparel Closure Type', value: 'Button' },
      { label: 'Hemline Form', value: 'Curved' },
      { label: 'Brand Name', value: 'JACK & JONES' },
      { label: 'Model Name', value: '12290084' },
      { label: 'Style Number', value: '12290084-Mid Blue' },
      { label: 'Country Of Origin', value: 'Bangladesh' },
      { label: 'Item Type Name', value: 'Shirt' },
      { label: 'Item Weight', value: '300 g' },
      { label: 'Material type', value: 'Cotton Blend' },
      { label: 'Fabric Type', value: '95% Cotton, 5% Cotton - recycled' },
      { label: 'Product Care Instructions', value: 'Machine Wash' },
      { label: 'Fabric Stretchability', value: 'Non-stretchable' },
      { label: 'ASIN', value: 'B0GX61Z4R9' },
    ],
  },
  {
    id: 'peter-england-pcsflslbj05093-black',
    title: 'Peter England Cotton Linen Solid Shirt — Black',
    brand: 'Peter England',
    category: "Men's Shirts",
    gender: 'MEN',
    price: 'See latest price on Amazon',
    image: '/products/peter-england-black.png',
    affiliateUrl: 'https://link.amazon/B0cpTcD9D',
    description:
      'A lightweight black solid shirt from Peter England with a slim, modern silhouette, collared neckline and long sleeves. Its cotton-linen fabric is designed for easy casual summer styling.',
    color: 'Black',
    fit: 'Slim Fit',
    style: 'Modern',
    neck: 'Collared Neck',
    sleeve: 'Long Sleeve',
    pattern: 'Solid',
    material: '62% Cotton and 38% Linen',
    care: 'Machine Wash',
    closure: 'Button',
    country: 'India',
    asin: 'B0F5QJDPWK',
    model: 'PCSFLSLBJ05093',
    rank: '#2,420 Clothing & Accessories • #138 Men’s Shirts',
    pockets: '1',
    season: 'Summer',
    occasion: 'Casual',
    published: true,
    specs: [
      { label: 'Colour', value: 'Black' },
      { label: 'Fitting type', value: 'Slim Fit' },
      { label: 'Style Name', value: 'Modern' },
      { label: 'Neck Style', value: 'Collared Neck' },
      { label: 'Sleeve Type', value: 'Long Sleeve' },
      { label: 'Shirt Form Type', value: 'Tuxedo Shirt' },
      { label: 'Collar Style', value: 'Spread Collar' },
      { label: 'Pattern', value: 'Solid' },
      { label: 'Season', value: 'Summer' },
      { label: 'Apparel Closure Type', value: 'Button' },
      { label: 'Cuff Style', value: 'Plain Hem' },
      { label: 'Apparel Occasion and Lifestyle', value: 'Casual' },
      { label: 'Brand Name', value: 'Peter England' },
      { label: 'Model Name', value: 'Cotton Linen Solids F/S Regular Collar-New' },
      { label: 'Style Number', value: 'PCSFLSLBJ05093' },
      { label: 'Country Of Origin', value: 'India' },
      { label: 'Item Type Name', value: 'Shirt' },
      { label: 'Item Weight', value: '400 g' },
      { label: 'Number Of Pockets', value: '1' },
      { label: 'Pocket Description', value: 'Chest Pocket' },
      { label: 'Material type', value: 'Cotton Blend' },
      { label: 'Fabric Type', value: '62% Cotton and 38% Linen' },
      { label: 'Product Care Instructions', value: 'Machine Wash' },
      { label: 'Apparel Fabric Weight Class', value: 'Lightweight' },
      { label: 'ASIN', value: 'B0F5QJDPWK' },
      { label: 'Customer Reviews', value: '4.1 out of 5 stars (112)' },
    ],
  },
  {
    id: 'highlander-hlsh008837-white',
    title: 'HIGHLANDER HLSH008837 Solid Mandarin Collar Shirt — White',
    brand: 'HIGHLANDER',
    category: "Men's Shirts",
    gender: 'MEN',
    price: 'See latest price on Amazon',
    image: '/products/highlander-white.png',
    affiliateUrl: 'https://link.amazon/B0ghQAHR9',
    description:
      'A clean white solid shirt from HIGHLANDER featuring a regular fit and a distinctive mandarin collar. The lightweight 100% cotton fabric makes it an easy summer-ready choice.',
    color: 'White',
    fit: 'Regular Fit',
    style: 'HLSH013828',
    neck: 'Mandarin Neck',
    sleeve: 'Short Sleeve',
    pattern: 'Solid',
    material: '100% Cotton',
    care: 'Machine Wash',
    closure: '',
    country: 'India',
    asin: 'B01N44MVFT',
    model: 'HLSH008837',
    rank: '#13,306 Clothing & Accessories • #585 Men’s Shirts',
    pockets: '',
    season: 'Summer',
    occasion: 'Casual',
    published: true,
    specs: [
      { label: 'Colour', value: 'WHITE' },
      { label: 'Fitting type', value: 'Regular Fit' },
      { label: 'Style Name', value: 'HLSH013828' },
      { label: 'Neck Style', value: 'Mandarin Neck' },
      { label: 'Sleeve Type', value: 'Short Sleeve' },
      { label: 'Collar Style', value: 'Mandarin Collar' },
      { label: 'Pattern', value: 'Solid' },
      { label: 'Season', value: 'Summer' },
      { label: 'Cuff Style', value: 'Plain Hem' },
      { label: 'Brand Name', value: 'Highlander' },
      { label: 'Model Name', value: 'HLSH008837' },
      { label: 'Style Number', value: 'HLSH008837' },
      { label: 'Country Of Origin', value: 'India' },
      { label: 'Item Type Name', value: 'Shirt' },
      { label: 'Item Weight', value: '300 g' },
      { label: 'Manufacturer Part Number', value: 'HLSH013828' },
      { label: 'ASIN', value: 'B01N44MVFT' },
      { label: 'Customer Reviews', value: '3.1 out of 5 stars (16)' },
      { label: 'Fitting type', value: 'Regular Fit' },
      { label: 'Sleeve Length Description', value: 'Long Sleeve' },
      { label: 'Is Customisable?', value: 'No' },
      { label: 'Material type', value: 'Cotton' },
      { label: 'Fabric Type', value: '100% Cotton' },
      { label: 'Product Care Instructions', value: 'Machine Wash' },
      { label: 'Apparel Fabric Weight Class', value: 'Lightweight' },
      { label: 'Item Length Description', value: 'Standard Length' },
    ],
  },
];
