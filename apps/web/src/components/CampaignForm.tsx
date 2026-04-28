'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useId } from 'react';

// ── Nigerian states + LGAs ────────────────────────────────────────────────────
const NG_LOCATIONS: Record<string, string[]> = {
  'Abuja (FCT)': ['Abaji','Abuja Municipal','Apo District','Asokoro','Bwari','Central Business District','Dakibiyu','Dakwo District','Dei-Dei','Duboyi','Durumi','Dutse-Alhaji','Gaduwa','Galadimawa','Garki 1','Garki 2','Gudu','Guzape District','Gwagwa','Gwagwalada','Gwarinpa','Idu Industrial','Jabi','Jahi','Jikwoyi','Jiwa','Kabusa','Kado','Karmo','Karshi','Karu','Katampe','Kaura','Kpeyegyi','Kubwa','Kuchigoro','Kuje','Kurudu','Kwali','Lokogoma','Lugbe District','Mabushi','Maitama','Mbora','Mpape','Nyanya','Okanje','Orozo','Pyakasa','Sabo Gida','Utako','Wumba','Wuse','Wuse 2','Wuye','Zuba'],
  'Abia': ['Aba North','Aba South','Arochukwu','Bende','Ikwuano','Isiala Ngwa','Isuikwuato','Obi Ngwa','Ohafia','Osisioma Ngwa','Ugwunagbo','Ukwa','Umuahia','Umu Nneochi'],
  'Adamawa': ['Demsa','Fufore','Ganye','Girei','Gombi','Guyuk','Hong','Jada','Lamurde','Madagali','Maiha','Mayo-Belwa','Michika','Mubi North','Mubi South','Numan','Shelleng','Song','Toungo','Yola North','Yola South'],
  'Akwa Ibom': ['Abak','Eastern Obolo','Eket','Esit-Eket','Essien Udim','Etim-Ekpo','Etinan','Ibeno','Ibesikpo Asutan','Ibiono Ibom','Ika','Ikono','Ikot Abasi','Ikot Ekpene','Ini','Itu','Mbo','Mkpat Enin','Nsit Atai','Nsit Ibom','Nsit Ubium','Oron','Uyo'],
  'Anambra': ['Aguata','Anambra East','Anambra West','Anaocha','Awka','Ayamelum','Dunukofia','Ekwusigo','Idemili','Ihiala','Njikoka','Nnewi','Ogbaru','Onitsha','Orumba','Oyi'],
  'Bauchi': ['Alkaleri','Bauchi LGA','Bogoro','Damban','Darazo','Dass','Gamawa','Ganjuwa','Giade','Itas/Gadau',"Jama'are",'Katagum','Kirfi','Misau','Ningi','Shira','Toro','Warji','Zaki'],
  'Bayelsa': ['Brass','Ekeremor','Kolokuma/Opokuma','Nembe','Ogbia','Sagbama','Southern Ijaw','Yenagoa'],
  'Benue': ['Ado','Agatu','Apa','Buruku','Gboko','Guma','Gwer','Katsina-Ala','Konshisha','Kwande','Logo','Makurdi','Obi','Ogbadibo','Ohimini','Oju','Okpokwu','Otukpo','Tarka','Ukum','Ushongo','Vandeikya'],
  'Borno': ['Abadam','Askira/Uba','Bama','Bayo','Biu','Chibok','Damboa','Dikwa','Gubio','Guzamala','Gwoza','Hawul','Jere','Kaga','Kala/Balge','Konduga','Kukawa','Kwaya Kusar','Mafa','Magumeri','Maiduguri','Marte','Mobbar','Monguno','Ngala','Nganzai','Shani'],
  'Cross River': ['Abi','Akamkpa','Akpabuyo','Bakassi','Bekwara','Biase','Boki','Calabar','Etung','Ikom','Obanliku','Obubra','Obudu','Odukpani','Ogoja','Yakuur','Yala'],
  'Delta': ['Aniocha North','Aniocha South','Bomadi','Burutu','Ethiope East','Ethiope West','Ika North East','Ika South','Isoko','Ndokwa East','Ndokwa West','Okpe','Oshimili North','Oshimili South','Patani','Sapele','Udu','Ugheli','Ukwuani','Uvwie','Warri'],
  'Ebonyi': ['Abakaliki','Afikpo North','Afikpo South','Ebonyi','Ezza','Ikwo','Ishielu','Ivo','Izzi','Ohaozara','Ohaukwu','Onicha'],
  'Edo': ['Akoko-Edo','Auchi','Benin City','Egor','Ekpoma','Esan North East','Fugar','Igueben','Ikpoba-Okha','Irrua','Okada','Orhionmwon','Ovia South','Owan','Ubiaja','Uhunmwonde'],
  'Ekiti': ['Ado Ekiti','Aiyekire (Gbonyin)','Aramoko','Efon','Emure','Ido-Osi','Ijero','Ikere','Ikole','Ilawe','Ilejemeje','Irepodun/Ifelodun','Ise/Orun','Moba','Omuo','Oye'],
  'Enugu': ['Aninri','Awgu','Enugu','Ezeagu','Igbo-Etiti','Igbo-Eze North','Igbo Eze South','Isi-Uzo','Nkanu East','Nkanu West','Nsukka','Oji-River','Udenu','Udi','Uzo-Uwani'],
  'Gombe': ['Akko','Balanga','Billiri','Dukku','Funakaye','Gombe LGA','Kaltungo','Kwami','Nafada','Shomgom','Yamaltu/Deba'],
  'Imo': ['Aboh-Mbaise','Ahiazu-Mbaise','Ehime-Mbano','Ezinihitte','Ideato North','Ideato South','Ihitte/Uboma','Ikeduru','Isiala Mbano','Isu','Mbaitoli','Ngor-Okpala','Njaba','Nkwerre','Nwangele','Obowo','Oguta','Ohaji/Egbema','Okigwe','Onuimo','Orlu','Orsu','Oru','Owerri'],
  'Jigawa': ['Auyo','Babura','Biriniwa','Buji','Dutse-Jigawa','Gagarawa','Garki','Gumel','Guri','Gwaram','Gwiwa','Hadejia','Jahun','Kafin Hausa','Kaugama','Kazaure','Kiri Kasamma','Kiyawa','Maigatari','Malam Madori','Miga','Ringim','Roni','Sule-Tankarkar','Taura','Yankwashi'],
  'Kaduna': ['Birnin-Gwari','Chikun','Giwa','Igabi','Ikara','Jaba',"Jema'a",'Kachia','Kaduna Municipal','Kagarko','Kajuru','Kaura','Kauru','Kubau','Kudan','Lere','Makarfi','Sanga','Soba','Zango-Kataf','Zaria'],
  'Kano': ['Ajingi','Albasu','Bagwai','Bebeji','Bichi','Bunkure','Dala','Dambatta','Dawakin Kudu','Dawakin Tofa','Doguwa','Fagge','Gabasawa','Garko','Garun Mallam','Gaya','Gezawa','Gwale','Gwarzo','Kabo','Kano Municipal','Karaye','Kibiya','Kiru','Kumbotso','Kunchi','Kura','Madobi','Makoda','Minjibir','Nasarawa-Kano','Rano','Rimin Gado','Rogo','Shanono','Sumaila','Takai','Tarauni','Tofa','Tsanyawa','Tudun Wada','Ungogo','Warawa','Wudil'],
  'Katsina': ['Bakori','Batagarawa','Batsari','Baure','Bindawa','Charanchi','Dandume','Danja','Dan Musa','Daura','Dutsi','Dutsin-Ma','Faskari','Funtua','Ingawa','Jibia','Kafur','Kaita','Kankara','Kankia','Katsina','Kurfi','Kusada',"Mai'adua",'Malumfashi','Mani','Mashi','Matazu','Musawa','Rimi','Sabuwa','Safana','Sandamu','Zango'],
  'Kebbi': ['Aleiro','Arewa-Dandi','Argungu','Augie','Bagudo','Birnin Kebbi','Bunza','Dandi','Fakai','Gwandu','Jega','Kalgo','Koko/Besse','Maiyama','Ngaski','Sakaba','Shanga','Suru','Wasagu/Danko','Yauri','Zuru'],
  'Kogi': ['Adavi','Ajaokuta','Ankpa','Bassa','Dekina','Ibaji','Idah','Igala Mela','Igalamela-Odolu','Ijumu','Kabba/Bunu','Kogi LGA','Koton Karfe','Lokoja','Mopa-Muro','Ofu','Ogori/Magongo','Okehi','Okene','Olamaboro','Omala','Yagba East','Yagba West'],
  'Kwara': ['Asa','Baruten','Edu','Ekiti-Kwara','Ifelodun-Kwara','Ilorin East','Ilorin South','Ilorin West','Irepodun-Kwara','Isin','Kaiama','Moro','Offa','Oke-Ero','Oyun','Pategi'],
  'Lagos': ['Abule Egba','Agbara-Igbesan','Agboyi/Ketu','Agege','Ajah','Ajeromi-Ifelodun','Alimosho','Amuwo-Odofin','Apapa','Badagry','Egbe/Idimu','Ejigbo','Eko Atlantic','Epe','Eti-Osa','Gbagada','Ibeju/Lekki','Ifako-Ijaye','Ikeja','Ikorodu','Ikotun/Igando','Ikoyi','Ilashe','Ilupeju','Ipaja','Isolo','Kosofe','Lagos Island','Lagos Mainland','Lekki','Magodo','Maryland','Mushin','Ogba','Ogudu','Ojo','Ojodu','Ojota','Orile','Oshodi-Isolo','Shomolu','Surulere','Victoria Island','Yaba'],
  'Nasarawa': ['Akwanga','Awe','Doma','Karu-Nasarawa','Keana','Keffi','Kokona','Lafia','Mararaba','Masaka','Nasarawa','Nasarawa-Eggon','Obi-Nasarawa','Toto','Wamba'],
  'Niger': ['Agaie','Agwara','Bida','Borgu','Bosso','Chanchaga','Edati','Gbako','Gurara','Katcha','Kontagora','Lapai','Lavun','Magama','Mariga','Mashegu','Minna','Mokwa','Muya','Paikoro','Rafi','Rijau','Shiroro','Suleja','Tafa','Wushishi'],
  'Ogun': ['Abeokuta North','Abeokuta South','Ado-Odo/Ota','Ayetoro','Ewekoro','Ifo','Ijebu East','Ijebu North','Ijebu North East','Ijebu Ode','Ikenne','Ilaro','Imeko-Afon','Ipokia','Obafemi-Owode','Odeda','Odogbolu','Ogun Waterside','Remo North','Sagamu','Yewa North','Yewa South'],
  'Ondo': ['Akungba','Akure','Ese-Odo','Idanre','Ifedore','Iju/Itaogbolu','Ikare Akoko','Ilaje','Ile-Oluji-Okeigbo','Irele','Odigbo','Okitipupa','Ondo','Ose','Owo'],
  'Osun': ['Aiyedade','Aiyedire','Atakumosa East','Atakumosa West','Boluwaduro','Boripe','Ede','Egbedore','Ife','Ifedayo','Ifelodun-Osun','Ikirun','Ila','Ilesa','Irepodun-Osun','Irewole','Isokan','Iwo','Obokun','Ola-Oluwa','Olorunda-Osun','Oriade','Orolu','Osogbo'],
  'Oyo': ['Afijio','Akinyele','Atiba','Atisbo','Egbeda','Eruwa','Ibadan','Ido','Igbo Ora','Irepo','Iseyin','Itesiwaju','Iwajowa','Kajola','Lagelu','Ogbomosho North','Ogbomosho South','Ogo Oluwa','Olorunsogo','Oluyole','Ona-Ara','Orelope','Ori Ire','Oyo','Saki East','Saki West','Surulere-Oyo'],
  'Plateau': ['Barkin Ladi','Bassa-Plateau','Bokkos','Jos','Kanam','Kanke','Langtang North','Langtang South','Mangu','Mikang','Pankshin','Quaan Pan','Riyom','Shendam','Wase'],
  'Rivers': ['Abua/Odual','Ahoada','Akuku Toru','Andoni','Asari-Toru','Bonny','Degema','Eleme','Emohua','Etche','Gokana','Ikwerre','Khana','Obio-Akpor','Ogba/Egbema/Ndoni','Ogu/Bolo','Okrika','Omuma','Oyigbo','Port Harcourt','Tai'],
  'Sokoto': ['Binji','Bodinga','Dange-Shuni','Gada','Goronyo','Gudu LGA','Gwadabawa','Illela','Isa','Kebbe','Kware','Rabah','Sabon Birni','Shagari','Silame','Sokoto North','Sokoto South','Tambuwal','Tangaza','Tureta','Wamako','Wurno','Yabo'],
  'Taraba': ['Ardo-Kola','Bali','Donga','Gashaka','Gassol','Ibi','Jalingo','Karim-Lamido','Kurmi','Lau','Sardauna','Takum','Ussa','Wukari','Yorro','Zing'],
  'Yobe': ['Bade','Bursari','Damaturu','Fika','Fune','Geidam','Gujba','Gulani','Jakusko','Karasuwa','Machina','Nangere','Nguru','Potiskum','Tarmua','Yunusari','Yusufari'],
  'Zamfara': ['Anka','Bakura','Birnin Magaji','Bukkuyum','Bungudu','Gummi','Gusau','Kaura Namoda','Maradun','Maru','Shinkafi','Talata Mafara','Tsafe','Zurmi'],
};

const NG_STATES = Object.keys(NG_LOCATIONS).sort();

// ── Property types (UI label → API enum) ──────────────────────────────────────
const PROPERTY_TYPES: { label: string; apiValue: string }[] = [
  { label: 'Detached Duplex',        apiValue: 'RESIDENTIAL' },
  { label: 'Semi-Detached Duplex',   apiValue: 'RESIDENTIAL' },
  { label: 'Terrace House',          apiValue: 'RESIDENTIAL' },
  { label: 'Apartment / Flat',       apiValue: 'RESIDENTIAL' },
  { label: 'Bungalow',               apiValue: 'RESIDENTIAL' },
  { label: 'Semi-Detached Bungalow', apiValue: 'RESIDENTIAL' },
  { label: 'Mansion',                apiValue: 'RESIDENTIAL' },
  { label: 'Penthouse',              apiValue: 'RESIDENTIAL' },
  { label: 'Studio Apartment',       apiValue: 'RESIDENTIAL' },
  { label: 'Mini Flat',              apiValue: 'RESIDENTIAL' },
  { label: 'Town House',             apiValue: 'RESIDENTIAL' },
  { label: 'Serviced Apartment',     apiValue: 'COMMERCIAL' },
  { label: 'Commercial Property',    apiValue: 'COMMERCIAL' },
  { label: 'Land / Plot',            apiValue: 'LAND' },
  { label: 'Mixed Use',              apiValue: 'MIXED_USE' },
];

const STANDARD_FEATURES = [
  'Swimming Pool','BQ (Boys Quarters)','Fitted Kitchen','Air Conditioning',
  'Generator / Inverter','Solar Power','CCTV & Security','Smart Home System',
  'Gym Room','Home Cinema','Elevator / Lift','Parking (2+ Cars)',
  'Perimeter Fence','Rooftop Terrace','Water Heater / Boiler',
  'Prepaid Meter','Internet / Fibre Ready','Gate House / Security Post',
];

const DEFAULT_BUNDLES = [
  { tickets: 1,  price: 2500,  label: '1 ticket' },
  { tickets: 5,  price: 10000, label: '5 tickets' },
  { tickets: 10, price: 18000, label: '10 tickets' },
  { tickets: 20, price: 32000, label: '20 tickets' },
];

const EMPTY_QUESTION = () => ({ question: '', options: ['', '', '', ''], correctIndex: 0 });

type Bundle = { tickets: number; price: number; label: string };
type SkillQuestion = { question: string; options: string[]; correctIndex: number };

export interface CampaignData {
  id?: string;
  title?: string;
  description?: string;
  propertyAddress?: string;
  propertyState?: string;
  propertyLga?: string;
  propertyType?: string;
  marketValue?: number;
  reservePrice?: number;
  ticketPrice?: number;
  totalTickets?: number;
  minTickets?: number;
  fccpcRef?: string | null;
  fccpcApprovalDate?: string | null;
  lslgaRef?: string | null;
  escrowBank?: string | null;
  escrowAccountNo?: string | null;
  allowedGateways?: string[];
  bundles?: Bundle[];
  skillQuestion?: unknown; // stored as JSON - could be old or new format
  drawDate?: string | null;
  drawMethod?: string;
  status?: string;
  // Direct Prisma columns
  featured?: boolean;
  cOfOConfirmed?: boolean | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  buildingArea?: number | null;
  propertyFeatures?: string[];
  galleryKeys?: string[];
  valuationFirm?: string | null;
  valuationRef?: string | null;
  propertyLawyer?: string | null;
  // videoUrl lives in skillQuestion.meta but may be pre-extracted
  videoUrl?: string | null;
}

interface Props {
  mode: 'create' | 'edit';
  initialData?: CampaignData;
  token: string;
}

const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

function SectionLabel({ icon, color, children }: { icon?: string; color?: string; children: React.ReactNode }) {
  return (
    <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-light)', marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
      {icon && <i className={`fa-solid ${icon}`} style={{ color: color ?? 'var(--text-muted)' }} />}
      {children}
    </div>
  );
}

function SubLabel({ icon, color, children }: { icon?: string; color?: string; children: React.ReactNode }) {
  return (
    <div style={{ fontSize: '0.6875rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: color ?? 'var(--text-muted)', marginBottom: '0.625rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
      {icon && <i className={`fa-solid ${icon}`} />}
      {children}
    </div>
  );
}

function extractSkillQuestions(raw: unknown): SkillQuestion[] {
  if (!raw) return [EMPTY_QUESTION(), EMPTY_QUESTION(), EMPTY_QUESTION(), EMPTY_QUESTION(), EMPTY_QUESTION()];
  const r = raw as Record<string, unknown>;
  if (Array.isArray(r['questions'])) return r['questions'] as SkillQuestion[];
  // Legacy single-question format
  if (r['question']) {
    const opts = (r['options'] as string[] | undefined) ?? ['', '', '', '', ''];
    return [{ question: r['question'] as string, options: opts.slice(0, 4), correctIndex: (r['correctIndex'] as number) ?? 0 }];
  }
  return [EMPTY_QUESTION(), EMPTY_QUESTION(), EMPTY_QUESTION(), EMPTY_QUESTION(), EMPTY_QUESTION()];
}

function extractMeta(raw: unknown): Record<string, unknown> {
  if (!raw) return {};
  const r = raw as Record<string, unknown>;
  return (r['meta'] as Record<string, unknown>) ?? {};
}

export default function CampaignForm({ mode, initialData, token }: Props) {
  const router = useRouter();

  // Extract meta-only fields stored in skillQuestion.meta
  const initMeta = extractMeta(initialData?.skillQuestion);

  // ── Basic info ────────────────────────────────────────────────────────────────
  const [title, setTitle]         = useState(initialData?.title ?? '');
  const [description, setDesc]    = useState(initialData?.description ?? '');
  const [address, setAddress]     = useState(initialData?.propertyAddress ?? '');
  const [state, setState]         = useState(initialData?.propertyState ?? '');
  const [lga, setLga]             = useState(initialData?.propertyLga ?? '');
  const [customAreas, setCustomAreas] = useState<string[]>([]);
  const [showAddArea, setShowAddArea] = useState(false);
  const [newAreaInput, setNewAreaInput] = useState('');
  const [propTypeLabel, setPropTypeLabel] = useState(() => {
    if (!initialData) return 'Detached Duplex';
    const stored = String(initMeta['propTypeLabel'] ?? '');
    if (stored) return stored;
    return PROPERTY_TYPES.find(p => p.apiValue === initialData.propertyType)?.label ?? 'Detached Duplex';
  });
  const [drawMethod, setDrawMethod]  = useState(initialData?.drawMethod ?? 'RANDOM');
  const [featured, setFeatured]      = useState(initialData?.featured ?? false);
  const [cofConfirmed, setCof]       = useState(initialData?.cOfOConfirmed ?? false);

  // ── Property details ──────────────────────────────────────────────────────────
  const [bedrooms, setBedrooms]     = useState(initialData?.bedrooms != null ? String(initialData.bedrooms) : '');
  const [bathrooms, setBathrooms]   = useState(initialData?.bathrooms != null ? String(initialData.bathrooms) : '');
  const [toilets, setToilets]       = useState(initMeta['toilets'] != null ? String(initMeta['toilets']) : '');
  const [buildingArea, setBuildingArea] = useState(initialData?.buildingArea != null ? String(initialData.buildingArea) : '');
  const [mapEmbedUrl, setMapEmbed]  = useState(String(initMeta['mapEmbedUrl'] ?? ''));
  const [features, setFeatures]     = useState<string[]>(initialData?.propertyFeatures ?? []);
  const [customFeatureInput, setCustomFeatureInput] = useState('');

  // ── Pricing ───────────────────────────────────────────────────────────────────
  const [marketValue, setMarketValue]   = useState(String(initialData?.marketValue ?? ''));
  const [reservePrice, setReservePrice] = useState(String(initialData?.reservePrice ?? ''));
  const [ticketPrice, setTicketPrice]   = useState(String(initialData?.ticketPrice ?? ''));
  const [totalTickets, setTotalTickets] = useState(String(initialData?.totalTickets ?? ''));
  const [minTickets, setMinTickets]     = useState(String(initialData?.minTickets ?? ''));
  const [bundles, setBundles]           = useState<Bundle[]>(initialData?.bundles ?? DEFAULT_BUNDLES);

  // ── Dates ─────────────────────────────────────────────────────────────────────
  const toDateInput = (d?: string | null) => d ? d.slice(0, 10) : '';
  const [drawDate, setDrawDate]         = useState(toDateInput(initialData?.drawDate));

  // ── Images / video ────────────────────────────────────────────────────────────
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [imageUrls, setImageUrls]         = useState<string[]>(initialData?.galleryKeys ?? []);
  const [imgTab, setImgTab]               = useState<'url' | 'upload'>('url');
  const [videoUrl, setVideoUrl]           = useState(String(initMeta['videoUrl'] ?? initialData?.videoUrl ?? ''));
  const [videoTab, setVideoTab]           = useState<'url' | 'upload'>('url');
  const [uploadingImg, setUploadingImg]   = useState(false);
  const [uploadErr, setUploadErr]         = useState('');
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadVideoErr, setUploadVideoErr] = useState('');
  const imgUploadInputRef                 = useRef<HTMLInputElement>(null);
  const videoUploadInputRef               = useRef<HTMLInputElement>(null);
  const tempEntityId                      = useRef<string>('');
  const uploadTabId                       = useId();
  const videoUploadTabId                  = useId();

  // ── Document upload state ─────────────────────────────────────────────────────
  type DocSlot = { key: string; label: string; purpose: string; icon: string };
  const DOC_SLOTS: DocSlot[] = [
    { key: 'cof',          label: 'C of O / Title Document',        purpose: 'title_deed',      icon: 'fa-certificate' },
    { key: 'nisvReport',   label: 'NIESV Valuation Report',          purpose: 'niesv_report',    icon: 'fa-file-contract' },
    { key: 'surveyPlan',   label: 'Survey Plan',                     purpose: 'survey_plan',     icon: 'fa-map' },
    { key: 'titleClearance', label: "Lawyer's Title Clearance",      purpose: 'title_clearance', icon: 'fa-scroll' },
  ];
  const [docUploading, setDocUploading]   = useState<Record<string, boolean>>({});
  const [docErrors, setDocErrors]         = useState<Record<string, string>>({});
  const [docKeys, setDocKeys]             = useState<Record<string, string>>(() => {
    const dk = (initialData as Record<string, unknown> | undefined)?.['documentKeys'] as Record<string, { r2Key: string }> | undefined;
    if (!dk) return {};
    const out: Record<string, string> = {};
    for (const slot of [{ key: 'cof' }, { key: 'nisvReport' }, { key: 'surveyPlan' }, { key: 'titleClearance' }]) {
      const entry = dk[slot.key];
      if (entry?.r2Key) out[slot.key] = entry.r2Key;
    }
    return out;
  });

  if (!tempEntityId.current) {
    tempEntityId.current = typeof crypto !== 'undefined' ? crypto.randomUUID() : `temp-${Date.now()}`;
  }

  const uploadEntityId = mode === 'edit' && initialData?.id ? initialData.id : tempEntityId.current;


  // ── Payment methods ───────────────────────────────────────────────────────────
  const [allowedGateways, setAllowedGateways] = useState<string[]>(
    initialData?.allowedGateways ?? ['PAYSTACK', 'FLUTTERWAVE', 'BANK_TRANSFER'],
  );

  function toggleGateway(gw: string) {
    setAllowedGateways(prev =>
      prev.includes(gw)
        ? prev.length > 1 ? prev.filter(g => g !== gw) : prev // keep at least one
        : [...prev, gw],
    );
  }

  // ── Regulatory ────────────────────────────────────────────────────────────────
  const [fccpcRef, setFccpcRef]             = useState(initialData?.fccpcRef ?? '');
  const [fccpcDate, setFccpcDate]           = useState(toDateInput(initialData?.fccpcApprovalDate));
  const [lslgaRef, setLslgaRef]             = useState(initialData?.lslgaRef ?? '');
  const [nisvValuerName, setNisvValuer]     = useState(initialData?.valuationFirm ?? '');
  const [nisvRegNumber, setNisvReg]         = useState(initialData?.valuationRef ?? '');
  const [escrowBank, setEscrowBank]         = useState(initialData?.escrowBank ?? '');
  const [escrowAcc, setEscrowAcc]           = useState(initialData?.escrowAccountNo ?? '');
  const [escrowAccountType, setEscrowType]  = useState(String(initMeta['escrowAccountType'] ?? 'Dedicated Escrow/Trust Account'));
  const [lawyerName, setLawyerName]         = useState(initialData?.propertyLawyer ?? '');

  // ── Referral ──────────────────────────────────────────────────────────────────
  const [referralReward, setRefReward]      = useState(initMeta['referralReward'] != null ? String(initMeta['referralReward']) : '300');
  const [referralFreeN, setRefFreeN]        = useState(initMeta['referralFreeTicketN'] != null ? String(initMeta['referralFreeTicketN']) : '5');

  // ── Skill questions ───────────────────────────────────────────────────────────
  const initQuestions = extractSkillQuestions(initialData?.skillQuestion);
  // Ensure at least 5
  while (initQuestions.length < 5) initQuestions.push(EMPTY_QUESTION());
  const [skillQuestions, setSkillQuestions] = useState<SkillQuestion[]>(initQuestions);
  const [generatingQuestions, setGeneratingQuestions] = useState(false);
  const [generateError, setGenerateError] = useState('');

  // ── Form state ────────────────────────────────────────────────────────────────
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState('');

  const currentStatus = initialData?.status ?? 'DRAFT';
  const canEdit = !['UPCOMING', 'LIVE', 'PAUSED', 'DRAWN', 'CANCELLED'].includes(currentStatus);

  // ── Location helpers ──────────────────────────────────────────────────────────
  const lgaOptions = state ? [...(NG_LOCATIONS[state] ?? []), ...customAreas] : [];

  function handleStateChange(newState: string) {
    setState(newState);
    setLga('');
    setCustomAreas([]);
    setShowAddArea(false);
    setNewAreaInput('');
  }

  function addCustomArea() {
    const val = newAreaInput.trim();
    if (!val || lgaOptions.includes(val)) return;
    setCustomAreas(prev => [...prev, val]);
    setLga(val);
    setShowAddArea(false);
    setNewAreaInput('');
  }

  // ── Feature helpers ───────────────────────────────────────────────────────────
  function toggleFeature(f: string) {
    setFeatures(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]);
  }

  function addCustomFeature() {
    const val = customFeatureInput.trim();
    if (!val || features.includes(val)) return;
    setFeatures(prev => [...prev, val]);
    setCustomFeatureInput('');
  }

  // ── Image helpers ─────────────────────────────────────────────────────────────
  function addImageUrl() {
    const val = imageUrlInput.trim();
    if (!val) return;
    setImageUrls(prev => [...prev, val]);
    setImageUrlInput('');
  }

  async function handleImageFileUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploadErr('');
    setUploadingImg(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]!;
        const fd = new FormData();
        fd.append('file', file);
        fd.append('purpose', 'campaign_gallery');
        fd.append('entityId', uploadEntityId);
        fd.append('index', String(imageUrls.length + i));
        const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
        const json = await res.json() as { success: boolean; data?: { key: string; publicUrl: string }; error?: string };
        if (!json.success || !json.data) throw new Error(json.error ?? `Upload failed for ${file.name}`);
        setImageUrls(prev => [...prev, json.data!.key]);
      }
    } catch (err) {
      setUploadErr(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploadingImg(false);
      if (imgUploadInputRef.current) imgUploadInputRef.current.value = '';
    }
  }

  async function handleVideoFileUpload(file: File | null) {
    if (!file) return;
    setUploadVideoErr('');
    setUploadingVideo(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('purpose', 'campaign_video');
      fd.append('entityId', uploadEntityId);
      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
      const json = await res.json() as { success: boolean; data?: { publicUrl: string }; error?: string };
      if (!json.success || !json.data) throw new Error(json.error ?? 'Video upload failed');
      setVideoUrl(json.data.publicUrl);
    } catch (err) {
      setUploadVideoErr(err instanceof Error ? err.message : 'Video upload failed');
    } finally {
      setUploadingVideo(false);
      if (videoUploadInputRef.current) videoUploadInputRef.current.value = '';
    }
  }

  async function handleDocUpload(slot: DocSlot, file: File) {
    if (!initialData?.id) return;
    setDocUploading(prev => ({ ...prev, [slot.key]: true }));
    setDocErrors(prev => ({ ...prev, [slot.key]: '' }));
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('purpose', slot.purpose);
      fd.append('entityId', initialData.id!);
      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
      const json = await res.json() as { success: boolean; data?: { key: string }; error?: string };
      if (!json.success || !json.data) throw new Error(json.error ?? 'Upload failed');

      // Record metadata against the campaign
      const patchRes = await fetch(`${API}/api/admin/campaigns/${initialData.id}/documents`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          docKey: slot.key,
          r2Key: json.data.key,
          issuer: 'Uploaded via Campaign Form',
          date: new Date().toISOString().slice(0, 10),
          ref: null,
          expiry: null,
        }),
      });
      const patchJson = await patchRes.json() as { success: boolean; error?: string };
      if (!patchJson.success) throw new Error(patchJson.error ?? 'Failed to save document record');
      setDocKeys(prev => ({ ...prev, [slot.key]: json.data!.key }));
    } catch (err) {
      setDocErrors(prev => ({ ...prev, [slot.key]: err instanceof Error ? err.message : 'Upload failed' }));
    } finally {
      setDocUploading(prev => ({ ...prev, [slot.key]: false }));
    }
  }

  // ── Skill question helpers ────────────────────────────────────────────────────
  function updateQuestion(idx: number, field: 'question' | 'correctIndex', val: string | number) {
    setSkillQuestions(prev => prev.map((q, i) => i === idx ? { ...q, [field]: val } : q));
  }

  function updateOption(qIdx: number, optIdx: number, val: string) {
    setSkillQuestions(prev => prev.map((q, i) => {
      if (i !== qIdx) return q;
      const opts = [...q.options];
      opts[optIdx] = val;
      return { ...q, options: opts };
    }));
  }

  function addQuestion() {
    setSkillQuestions(prev => [...prev, EMPTY_QUESTION()]);
  }

  function removeQuestion(idx: number) {
    if (skillQuestions.length <= 5) return; // keep min 5
    setSkillQuestions(prev => prev.filter((_, i) => i !== idx));
  }

  async function generateQuestionsWithAI() {
    if (!initialData?.id) {
      setGenerateError('Save the campaign first, then generate questions.');
      return;
    }
    setGeneratingQuestions(true);
    setGenerateError('');
    try {
      const res = await fetch(
        `${API}/api/admin/campaigns/${initialData.id}/generate-questions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ count: 5 }),
        },
      );
      const json = await res.json() as { success: boolean; data?: { questions: SkillQuestion[] }; error?: string };
      if (!json.success || !json.data) throw new Error(json.error ?? 'Generation failed');
      setSkillQuestions(json.data.questions);
    } catch (e) {
      setGenerateError(e instanceof Error ? e.message : 'Failed to generate questions');
    } finally {
      setGeneratingQuestions(false);
    }
  }

  // ── Bundle helpers ────────────────────────────────────────────────────────────
  function updateBundle(idx: number, field: keyof Bundle, val: string) {
    setBundles(prev => prev.map((b, i) => i === idx ? { ...b, [field]: field === 'label' ? val : Number(val) } : b));
  }

  // ── Submit ────────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    // Validate skill questions
    for (let i = 0; i < skillQuestions.length; i++) {
      const q = skillQuestions[i]!;
      if (!q.question.trim()) { setError(`Question ${i + 1} is missing a question text.`); setSaving(false); return; }
      if (q.options.some(o => !o.trim())) { setError(`Question ${i + 1} has empty answer options.`); setSaving(false); return; }
    }

    const apiPropType = PROPERTY_TYPES.find(p => p.label === propTypeLabel)?.apiValue ?? 'RESIDENTIAL';

    const payload = {
      title,
      description: description || undefined,
      propertyAddress: address,
      propertyState: state,
      propertyLga: lga,
      propertyType: apiPropType,
      marketValue: Number(marketValue),
      reservePrice: Number(reservePrice),
      ticketPrice: Number(ticketPrice),
      totalTickets: Number(totalTickets),
      minTickets: Number(minTickets),
      bundles: bundles.filter(b => b.price > 0),
      skillQuestions,
      drawDate: drawDate ? new Date(drawDate).toISOString() : undefined,
      drawMethod,
      allowedGateways,
      fccpcRef: fccpcRef || undefined,
      fccpcApprovalDate: fccpcDate || undefined,
      lslgaRef: lslgaRef || undefined,
      escrowBank: escrowBank || undefined,
      escrowAccountNo: escrowAcc || undefined,
      escrowAccountType: escrowAccountType || undefined,
      valuationFirm: nisvValuerName || undefined,
      valuationRef: nisvRegNumber || undefined,
      propertyLawyer: lawyerName || undefined,
      featured,
      cOfOConfirmed: cofConfirmed,
      bedrooms: bedrooms ? Number(bedrooms) : undefined,
      bathrooms: bathrooms ? Number(bathrooms) : undefined,
      toilets: toilets ? Number(toilets) : undefined,
      buildingArea: buildingArea ? Number(buildingArea) : undefined,
      mapEmbedUrl: mapEmbedUrl || undefined,
      propertyFeatures: features.length ? features : undefined,
      imageUrls: imageUrls.length ? imageUrls : undefined,
      videoUrl: videoUrl || undefined,
      referralReward: referralReward ? Number(referralReward) : undefined,
      referralFreeTicketN: referralFreeN ? Number(referralFreeN) : undefined,
      propTypeLabel,
    };

    const url = mode === 'create'
      ? `${API}/api/admin/campaigns`
      : `${API}/api/admin/campaigns/${initialData!.id}`;
    const method = mode === 'create' ? 'POST' : 'PUT';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const json = await res.json() as { success: boolean; error?: string; data?: { id: string } };
      if (!res.ok) throw new Error(json.error ?? 'Save failed');
      setSuccess(mode === 'create' ? 'Campaign created!' : 'Changes saved.');
      if (mode === 'create' && json.data?.id) {
        router.push(`/admin/campaigns/${json.data.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  }


  const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

  return (
    <form onSubmit={handleSubmit}>

      {/* ── Error / success banners ──────────────────────────────────────────── */}
      {error && (
        <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 'var(--radius)', fontSize: '0.875rem', color: '#dc2626' }}>
          <i className="fa-solid fa-circle-xmark" style={{ marginRight: '0.5rem' }} />{error}
        </div>
      )}
      {success && (
        <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: '#dcfce7', border: '1px solid #86efac', borderRadius: 'var(--radius)', fontSize: '0.875rem', color: '#166534' }}>
          <i className="fa-solid fa-circle-check" style={{ marginRight: '0.5rem' }} />{success}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION: Basic Information
      ════════════════════════════════════════════════════════════════════════ */}
      <SectionLabel>Basic Information</SectionLabel>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Campaign Title *</label>
          <input className="form-input" value={title} onChange={e => setTitle(e.target.value)}
            placeholder="e.g. 4-Bedroom Detached Duplex, Lekki Phase 1" required disabled={!canEdit} />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Property Type *</label>
          <select className="form-select" value={propTypeLabel} onChange={e => setPropTypeLabel(e.target.value)} required disabled={!canEdit}>
            {PROPERTY_TYPES.map(p => <option key={p.label} value={p.label}>{p.label}</option>)}
          </select>
        </div>
      </div>

      {/* Location: State → LGA cascade */}
      <div className="form-group">
        <label className="form-label">Property Location *</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.625rem' }}>
          <select className="form-select" value={state} onChange={e => handleStateChange(e.target.value)} required disabled={!canEdit}>
            <option value="">— Select State —</option>
            {NG_STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="form-select" value={lga} onChange={e => setLga(e.target.value)} required disabled={!canEdit || !state}>
            <option value="">— Select Area / District —</option>
            {lgaOptions.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>

        {/* Add custom area */}
        {canEdit && state && (
          <>
            <div style={{ marginBottom: '0.5rem' }}>
              <button type="button" onClick={() => setShowAddArea(v => !v)}
                style={{ background: 'none', border: 'none', color: 'var(--green-primary)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, padding: 0, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <i className="fa-solid fa-circle-plus" />Add area not in list
              </button>
            </div>
            {showAddArea && (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 10, padding: '0.625rem 0.75rem', marginBottom: '0.625rem' }}>
                <i className="fa-solid fa-map-pin" style={{ color: 'var(--green-primary)', flexShrink: 0 }} />
                <input type="text" className="form-input" placeholder="Type new area or neighbourhood name…"
                  value={newAreaInput} onChange={e => setNewAreaInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomArea(); } }}
                  style={{ flex: 1, margin: 0, padding: '0.375rem 0.625rem', fontSize: '0.875rem' }} />
                <button type="button" onClick={addCustomArea} className="btn btn-primary btn-sm" style={{ whiteSpace: 'nowrap' }}>
                  <i className="fa-solid fa-plus" /> Add
                </button>
                <button type="button" onClick={() => { setShowAddArea(false); setNewAreaInput(''); }} className="btn btn-outline btn-sm" style={{ whiteSpace: 'nowrap' }}>
                  Cancel
                </button>
              </div>
            )}
          </>
        )}

        <input className="form-input" value={address} onChange={e => setAddress(e.target.value)}
          placeholder="Street address, landmark or property name" required disabled={!canEdit} />
        <div className="form-hint">e.g. 24 Aminu Kano Crescent · Plot 5 Block B Nicon Town · After Transcorp Hilton</div>
      </div>

      {/* Draw method */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Draw Method</label>
          <select className="form-select" value={drawMethod} onChange={e => setDrawMethod(e.target.value)} disabled={!canEdit}>
            <option value="RANDOM">Random (System)</option>
            <option value="RANDOM_ORG_VERIFIED">Random.org Verified</option>
          </select>
        </div>
        <div className="form-group" style={{ marginBottom: 0 }} />
      </div>

      {/* Description */}
      <div className="form-group">
        <label className="form-label">Campaign Description</label>
        <textarea className="form-textarea" rows={3}
          placeholder="Describe the property, neighbourhood, and what makes this draw special..."
          value={description} onChange={e => setDesc(e.target.value)} disabled={!canEdit}
          style={{ resize: 'vertical' }} />
      </div>

      {/* Featured + CoO toggles */}
      <div style={{ display: 'flex', gap: '2rem', marginBottom: '1.25rem', flexWrap: 'wrap', padding: '0.875rem 1rem', background: 'var(--bg-secondary)', borderRadius: 10 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: canEdit ? 'pointer' : 'default', fontSize: '0.875rem', fontWeight: 600 }}>
          <input type="checkbox" checked={featured} onChange={e => setFeatured(e.target.checked)} disabled={!canEdit}
            style={{ width: '1rem', height: '1rem', accentColor: 'var(--gold)' }} />
          <i className="fa-solid fa-star" style={{ color: 'var(--gold)' }} />
          Featured Campaign
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>(shows ⭐ Featured badge on campaign card)</span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: canEdit ? 'pointer' : 'default', fontSize: '0.875rem', fontWeight: 600 }}>
          <input type="checkbox" checked={cofConfirmed} onChange={e => setCof(e.target.checked)} disabled={!canEdit}
            style={{ width: '1rem', height: '1rem', accentColor: 'var(--green-primary)' }} />
          <i className="fa-solid fa-certificate" style={{ color: 'var(--green-primary)' }} />
          C of O Confirmed
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>(certificate of occupancy verified by legal)</span>
        </label>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION: Pricing & Tickets
      ════════════════════════════════════════════════════════════════════════ */}
      <SectionLabel>Pricing & Tickets</SectionLabel>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: '1rem', marginBottom: '1rem' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Market Value (₦) *</label>
          <input type="number" className="form-input" value={marketValue} onChange={e => setMarketValue(e.target.value)} placeholder="95000000" min={1} required disabled={!canEdit} />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Reserve Price (₦) *</label>
          <input type="number" className="form-input" value={reservePrice} onChange={e => setReservePrice(e.target.value)} placeholder="66000000" min={1} required disabled={!canEdit} />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Ticket Price (₦) *</label>
          <input type="number" className="form-input" value={ticketPrice} onChange={e => setTicketPrice(e.target.value)} placeholder="2500" min={500} required disabled={!canEdit} />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Total Tickets *</label>
          <input type="number" className="form-input" value={totalTickets} onChange={e => setTotalTickets(e.target.value)} placeholder="25000" min={100} required disabled={!canEdit} />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Min. Threshold *</label>
          <input type="number" className="form-input" value={minTickets} onChange={e => setMinTickets(e.target.value)} placeholder="20000" min={1} required disabled={!canEdit} />
          <div className="form-hint">Below this = full refund (FCCPA §123)</div>
        </div>
      </div>

      {/* Bundle pricing */}
      <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius)', padding: '1rem', marginBottom: '1rem' }}>
        <div style={{ fontSize: '0.8125rem', fontWeight: 700, marginBottom: '0.875rem' }}>Bundle Pricing</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '0.75rem' }}>
          {bundles.map((b, idx) => (
            <div key={idx}>
              <label className="form-label" style={{ fontSize: '0.75rem' }}>{b.label} (₦)</label>
              <input type="number" className="form-input" value={b.price} disabled={!canEdit}
                onChange={e => updateBundle(idx, 'price', e.target.value)} min={0} />
            </div>
          ))}
        </div>
      </div>

      {/* Draw date */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Draw Date</label>
          <input type="date" className="form-input" value={drawDate} onChange={e => setDrawDate(e.target.value)} disabled={!canEdit} />
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION: Payment Methods
      ════════════════════════════════════════════════════════════════════════ */}
      <SectionLabel icon="fa-credit-card" color="#1e40af">Payment Methods</SectionLabel>

      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: 1.6 }}>
          Select which payment methods buyers can use for this campaign.
          At least one must remain enabled. Bank Transfer requires manual admin confirmation.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {([
            {
              gw: 'PAYSTACK',
              label: 'Paystack',
              desc: 'Card, bank transfer & USSD via Paystack — automatic confirmation',
              icon: 'fa-credit-card',
              color: '#00c3f7',
            },
            {
              gw: 'FLUTTERWAVE',
              label: 'Flutterwave',
              desc: 'Card, bank transfer & mobile money via Flutterwave — automatic confirmation',
              icon: 'fa-bolt',
              color: '#f5a623',
            },
            {
              gw: 'BANK_TRANSFER',
              label: 'Direct Bank Transfer',
              desc: 'User transfers directly to escrow account — requires manual admin confirmation',
              icon: 'fa-building-columns',
              color: '#a16207',
            },
          ] as const).map(({ gw, label, desc, icon, color }) => {
            const enabled = allowedGateways.includes(gw);
            const isLast = allowedGateways.length === 1 && enabled;
            return (
              <label
                key={gw}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: '0.875rem',
                  padding: '0.875rem 1rem', borderRadius: 10, cursor: canEdit && !isLast ? 'pointer' : 'default',
                  border: `1.5px solid ${enabled ? color : 'var(--border)'}`,
                  background: enabled ? `${color}0f` : 'var(--bg-secondary)',
                  opacity: isLast ? 0.6 : 1,
                  transition: 'border-color 0.15s, background 0.15s',
                }}
              >
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={() => canEdit && toggleGateway(gw)}
                  disabled={!canEdit || isLast}
                  style={{ marginTop: '0.1rem', width: 16, height: 16, accentColor: color, flexShrink: 0, cursor: canEdit && !isLast ? 'pointer' : 'default' }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                    <i className={`fa-solid ${icon}`} style={{ color, fontSize: '0.875rem' }} />
                    <span style={{ fontWeight: 700, fontSize: '0.875rem', color: enabled ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      {label}
                    </span>
                    {enabled && (
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.1rem 0.45rem', borderRadius: 20, background: `${color}22`, color }}>
                        Enabled
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{desc}</div>
                </div>
              </label>
            );
          })}
        </div>

        {allowedGateways.length === 0 && (
          <div style={{ marginTop: '0.5rem', fontSize: '0.8125rem', color: '#dc2626' }}>
            <i className="fa-solid fa-circle-exclamation" style={{ marginRight: '0.375rem' }} />
            At least one payment method must be enabled.
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION: Property Details
      ════════════════════════════════════════════════════════════════════════ */}
      <SectionLabel>Property Details</SectionLabel>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1rem', marginBottom: '1rem' }}>
        {[
          { label: 'Bedrooms', val: bedrooms, set: setBedrooms, ph: '4' },
          { label: 'Bathrooms', val: bathrooms, set: setBathrooms, ph: '4' },
          { label: 'Toilets', val: toilets, set: setToilets, ph: '5' },
          { label: 'Size (sqm)', val: buildingArea, set: setBuildingArea, ph: '320' },
        ].map(({ label, val, set, ph }) => (
          <div key={label} className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">{label}</label>
            <input type="number" className="form-input" placeholder={ph} min={0}
              value={val} onChange={e => set(e.target.value)} disabled={!canEdit} />
          </div>
        ))}
      </div>

      <div className="form-group">
        <label className="form-label">
          Google Maps Embed URL <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>— optional</span>
        </label>
        <input type="url" className="form-input" placeholder="https://www.google.com/maps/embed?pb=..."
          value={mapEmbedUrl} onChange={e => setMapEmbed(e.target.value)} disabled={!canEdit} />
        <div className="form-hint">Go to Google Maps → Share → Embed a map → copy the <code>src</code> URL from the iframe snippet</div>
      </div>

      {/* Property features */}
      <div className="form-group">
        <label className="form-label">Property Features</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))', gap: '0.5rem 1rem', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 10, marginBottom: '0.625rem' }}>
          {STANDARD_FEATURES.map(f => (
            <label key={f} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: canEdit ? 'pointer' : 'default' }}>
              <input type="checkbox" checked={features.includes(f)} onChange={() => canEdit && toggleFeature(f)}
                disabled={!canEdit} style={{ accentColor: 'var(--green-primary)' }} />
              {f}
            </label>
          ))}
        </div>
        {/* Custom features */}
        {features.filter(f => !STANDARD_FEATURES.includes(f)).map(f => (
          <span key={f} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', background: 'var(--green-50,#f0fdf4)', border: '1px solid var(--green-primary)', borderRadius: 6, padding: '0.2rem 0.5rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--green-primary)', marginRight: '0.375rem', marginBottom: '0.375rem' }}>
            {f}
            {canEdit && <button type="button" onClick={() => toggleFeature(f)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0, lineHeight: 1, fontSize: '0.875rem' }}>×</button>}
          </span>
        ))}
        {canEdit && (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.5rem' }}>
            <input type="text" className="form-input" placeholder="Add custom feature..."
              value={customFeatureInput} onChange={e => setCustomFeatureInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomFeature(); } }}
              style={{ flex: 1 }} />
            <button type="button" onClick={addCustomFeature} className="btn btn-outline btn-sm">
              <i className="fa-solid fa-plus" /> Add
            </button>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION: Campaign Images
      ════════════════════════════════════════════════════════════════════════ */}
      <SectionLabel>Campaign Images</SectionLabel>

      <div className="form-group">
        <label className="form-label">
          Campaign Images <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(first image is the hero)</span>
        </label>

        {/* Tab switcher */}
        <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', marginBottom: '0.875rem', width: 'fit-content' }}>
          {(['url', 'upload'] as const).map(tab => (
            <button key={tab} type="button" onClick={() => setImgTab(tab)}
              style={{ padding: '0.5rem 1rem', fontSize: '0.8125rem', fontWeight: 700, background: imgTab === tab ? 'var(--green-primary)' : '#fff', color: imgTab === tab ? '#fff' : 'var(--text-muted)', border: 'none', cursor: 'pointer', transition: 'all 0.15s' }}>
              <i className={`fa-solid ${tab === 'url' ? 'fa-link' : 'fa-arrow-up-from-bracket'}`} style={{ marginRight: '0.375rem' }} />
              {tab === 'url' ? 'Paste URL' : 'Upload from Device'}
            </button>
          ))}
        </div>

        {imgTab === 'url' && (
          <>
            <div style={{ display: 'flex', gap: '0.625rem', marginBottom: '0.5rem' }}>
              <input type="url" className="form-input" placeholder="https://images.unsplash.com/photo-..."
                value={imageUrlInput} onChange={e => setImageUrlInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addImageUrl(); } }}
                style={{ flex: 1 }} disabled={!canEdit} />
              <button type="button" onClick={addImageUrl} className="btn btn-outline" style={{ whiteSpace: 'nowrap' }} disabled={!canEdit}>
                <i className="fa-solid fa-plus" /> Add
              </button>
            </div>
            <div className="form-hint">Press Add or hit Enter to add each image. You can add multiple images.</div>
          </>
        )}

        {imgTab === 'upload' && (
          <div>
            <input
              ref={imgUploadInputRef}
              id={uploadTabId}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              disabled={!canEdit || uploadingImg}
              style={{ display: 'none' }}
              onChange={e => handleImageFileUpload(e.target.files)}
            />
            <label
              htmlFor={uploadTabId}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                border: '2px dashed var(--border)', borderRadius: 10, padding: '1.75rem',
                background: 'var(--bg-secondary)', cursor: canEdit ? 'pointer' : 'not-allowed', gap: '0.375rem',
              }}
            >
              {uploadingImg
                ? <><i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '1.75rem', color: 'var(--green-primary)' }} /><span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Uploading…</span></>
                : <><i className="fa-solid fa-cloud-arrow-up" style={{ fontSize: '1.75rem', color: 'var(--green-primary)' }} /><span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Click to choose images</span><span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>JPEG, PNG, WebP — multiple allowed</span></>
              }
            </label>
            {uploadErr && <p style={{ fontSize: '0.8125rem', color: '#dc2626', marginTop: '0.5rem' }}>{uploadErr}</p>}
          </div>
        )}

        {/* Image preview */}
        {imageUrls.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.625rem', marginTop: '0.875rem' }}>
            {imageUrls.map((url, i) => (
              <div key={i} style={{ position: 'relative', width: 100, height: 70, borderRadius: 8, overflow: 'hidden', border: '2px solid var(--border)', flexShrink: 0 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                {i === 0 && <span style={{ position: 'absolute', bottom: 2, left: 2, fontSize: '0.5625rem', fontWeight: 700, background: 'var(--green-primary)', color: '#fff', borderRadius: 3, padding: '1px 4px' }}>HERO</span>}
                {canEdit && (
                  <button type="button" onClick={() => setImageUrls(prev => prev.filter((_, j) => j !== i))}
                    style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', borderRadius: '50%', width: 18, height: 18, cursor: 'pointer', fontSize: '0.75rem', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="form-hint" style={{ marginTop: '0.5rem' }}>No images added yet. The first image will be used as the hero/cover image.</div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION: Property Video
      ════════════════════════════════════════════════════════════════════════ */}
      <SectionLabel>Property Video</SectionLabel>

      <div className="form-group">
        <label className="form-label">
          Walkthrough / Showcase Video <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>— optional</span>
        </label>

        {/* Tab switcher */}
        <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', marginBottom: '0.875rem', width: 'fit-content' }}>
          {(['url', 'upload'] as const).map(tab => (
            <button key={tab} type="button" onClick={() => setVideoTab(tab)}
              style={{ padding: '0.5rem 1rem', fontSize: '0.8125rem', fontWeight: 700, background: videoTab === tab ? 'var(--green-primary)' : '#fff', color: videoTab === tab ? '#fff' : 'var(--text-muted)', border: 'none', cursor: 'pointer', transition: 'all 0.15s' }}>
              <i className={`fa-solid ${tab === 'url' ? 'fa-link' : 'fa-arrow-up-from-bracket'}`} style={{ marginRight: '0.375rem' }} />
              {tab === 'url' ? 'Paste URL' : 'Upload from Device'}
            </button>
          ))}
        </div>

        {videoTab === 'url' && (
          <>
            <input type="url" className="form-input" placeholder="https://www.youtube.com/embed/... or direct .mp4 URL"
              value={videoUrl} onChange={e => setVideoUrl(e.target.value)} disabled={!canEdit} style={{ marginBottom: '0.375rem' }} />
            <div className="form-hint"><strong>YouTube:</strong> open the video → Share → Embed → copy the <code>src</code> from the iframe.</div>
          </>
        )}

        {videoTab === 'upload' && (
          <div>
            <input
              ref={videoUploadInputRef}
              id={videoUploadTabId}
              type="file"
              accept="video/mp4,video/quicktime,video/webm,video/*"
              disabled={!canEdit || uploadingVideo}
              style={{ display: 'none' }}
              onChange={e => handleVideoFileUpload(e.target.files?.[0] ?? null)}
            />
            <label htmlFor={videoUploadTabId}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px dashed var(--border)', borderRadius: 10, padding: '1.75rem', background: 'var(--bg-secondary)', cursor: canEdit ? 'pointer' : 'not-allowed', gap: '0.375rem' }}>
              {uploadingVideo
                ? <><i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '1.75rem', color: 'var(--green-primary)' }} /><span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Uploading…</span></>
                : <><i className="fa-solid fa-film" style={{ fontSize: '1.75rem', color: 'var(--green-primary)' }} /><span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Click to choose a video file</span><span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>MP4, MOV, WebM — up to 200 MB</span></>
              }
            </label>
            {uploadVideoErr && <p style={{ fontSize: '0.8125rem', color: '#dc2626', marginTop: '0.5rem' }}>{uploadVideoErr}</p>}
            {videoUrl && videoTab === 'upload' && (
              <div style={{ marginTop: '0.625rem', fontSize: '0.8125rem', color: 'var(--green-primary)', fontWeight: 600 }}>
                <i className="fa-solid fa-circle-check" style={{ marginRight: '0.375rem' }} />Video uploaded successfully
                <button type="button" onClick={() => setVideoUrl('')}
                  style={{ marginLeft: '0.75rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8125rem' }}>
                  Remove
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION: Property Documents
      ════════════════════════════════════════════════════════════════════════ */}
      <SectionLabel icon="fa-file-arrow-up" color="#6d28d9">Property Documents</SectionLabel>

      {mode === 'create' ? (
        <div style={{ padding: '1rem 1.25rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <i className="fa-solid fa-circle-info" style={{ color: '#6d28d9', fontSize: '1.1rem', flexShrink: 0 }} />
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            <strong style={{ color: 'var(--text-primary)' }}>Save the campaign first</strong>, then document upload (C of O, Survey Plan, NIESV Report, Title Clearance) will appear here.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
          {DOC_SLOTS.map(slot => {
            const uploaded = !!docKeys[slot.key];
            const uploading = !!docUploading[slot.key];
            const err = docErrors[slot.key] ?? '';
            const inputId = `doc-upload-${slot.key}`;
            return (
              <div key={slot.key} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.875rem 1rem', background: uploaded ? '#f0fdf4' : 'var(--bg-secondary)', border: `1.5px solid ${uploaded ? '#86efac' : 'var(--border)'}`, borderRadius: 10, flexWrap: 'wrap' }}>
                <i className={`fa-solid ${slot.icon}`} style={{ color: uploaded ? 'var(--green-primary)' : '#6d28d9', fontSize: '1.1rem', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700 }}>{slot.label}</div>
                  {uploaded
                    ? <div style={{ fontSize: '0.75rem', color: 'var(--green-primary)', fontWeight: 600 }}><i className="fa-solid fa-circle-check" style={{ marginRight: '0.3rem' }} />Uploaded</div>
                    : <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Not uploaded — PDF, JPEG or PNG</div>
                  }
                  {err && <div style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '0.25rem' }}>{err}</div>}
                </div>
                {canEdit && (
                  <>
                    <input id={inputId} type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                      style={{ display: 'none' }} disabled={uploading}
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleDocUpload(slot, f); e.target.value = ''; }} />
                    <label htmlFor={inputId} className="btn btn-outline btn-sm" style={{ cursor: 'pointer', flexShrink: 0, opacity: uploading ? 0.6 : 1 }}>
                      {uploading
                        ? <><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '0.375rem' }} />Uploading…</>
                        : <><i className="fa-solid fa-arrow-up-from-bracket" style={{ marginRight: '0.375rem' }} />{uploaded ? 'Replace' : 'Upload'}</>
                      }
                    </label>
                  </>
                )}
              </div>
            );
          })}
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', paddingLeft: '0.25rem' }}>
            <i className="fa-solid fa-circle-info" style={{ marginRight: '0.375rem' }} />
            For issuer details and expiry dates, use the full{' '}
            <a href={`/admin/property-manager?campaign=${initialData?.id}`} target="_blank" rel="noopener noreferrer"
              style={{ color: '#6d28d9', fontWeight: 600 }}>Property Manager</a>.
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION: Regulatory & Legal
      ════════════════════════════════════════════════════════════════════════ */}
      <SectionLabel>Regulatory & Legal</SectionLabel>

      {/* FCCPC */}
      <SubLabel icon="fa-shield-halved" color="#1e40af">FCCPC Approval</SubLabel>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">
            Approval Reference
            {currentStatus === 'REVIEW' && <span style={{ color: '#dc2626', marginLeft: '0.25rem' }}>*</span>}
          </label>
          <input className="form-input" value={fccpcRef} onChange={e => setFccpcRef(e.target.value)}
            placeholder="FCCPC/SP/2024/001" style={{ fontFamily: 'monospace' }} disabled={!canEdit} />
          <div className="form-hint">Required before publishing to Live</div>
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Approval Date</label>
          <input type="date" className="form-input" value={fccpcDate} onChange={e => setFccpcDate(e.target.value)} disabled={!canEdit} />
        </div>
      </div>

      {/* LSLGA — Lagos only */}
      {state === 'Lagos' && (
        <>
          <SubLabel icon="fa-building-columns" color="#6d28d9">
            LSLGA Licence <span style={{ fontSize: '0.625rem', background: '#ede9fe', color: '#6d28d9', padding: '0.15rem 0.4rem', borderRadius: 4, fontWeight: 700, marginLeft: '0.25rem' }}>Lagos campaigns only</span>
          </SubLabel>
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="form-label">LSLGA Licence Number</label>
            <input className="form-input" value={lslgaRef} onChange={e => setLslgaRef(e.target.value)}
              placeholder="LSLGA/2024/RP/001" style={{ fontFamily: 'monospace' }} disabled={!canEdit} />
            <div className="form-hint">Lagos State Lotteries & Gaming Authority licence number</div>
          </div>
        </>
      )}

      {/* NIESV */}
      <SubLabel icon="fa-file-contract" color="#6d28d9">NIESV Valuation</SubLabel>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Valuer&apos;s Full Name</label>
          <input className="form-input" value={nisvValuerName} onChange={e => setNisvValuer(e.target.value)}
            placeholder="e.g. Adeyemi Oluwaseun FNIESV" disabled={!canEdit} />
          <div className="form-hint">NIESV-certified surveyor who valued the property</div>
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">NIESV Registration Number</label>
          <input className="form-input" value={nisvRegNumber} onChange={e => setNisvReg(e.target.value)}
            placeholder="e.g. NIESV/LOS/2019/0847" style={{ fontFamily: 'monospace' }} disabled={!canEdit} />
        </div>
      </div>

      {/* Escrow */}
      <SubLabel icon="fa-vault" color="#92400e">Escrow</SubLabel>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.75rem' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Escrow Bank</label>
          <input className="form-input" value={escrowBank} onChange={e => setEscrowBank(e.target.value)}
            placeholder="e.g. Stanbic IBTC Bank" disabled={!canEdit} />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Escrow Account Number</label>
          <input className="form-input" value={escrowAcc} onChange={e => setEscrowAcc(e.target.value)}
            placeholder="0123456789" disabled={!canEdit} />
        </div>
      </div>
      <div className="form-group" style={{ marginBottom: '1rem' }}>
        <label className="form-label">Escrow Account Type</label>
        <select className="form-select" value={escrowAccountType} onChange={e => setEscrowType(e.target.value)} disabled={!canEdit}>
          <option value="Dedicated Escrow/Trust Account">Dedicated Escrow / Trust Account</option>
          <option value="Blocked Account">Blocked Account</option>
          <option value="Solicitors Client Account">Solicitors Client Account</option>
        </select>
      </div>

      {/* Legal */}
      <SubLabel icon="fa-scale-balanced" color="#166534">Legal</SubLabel>
      <div className="form-group" style={{ marginBottom: '1.25rem' }}>
        <label className="form-label">Lawyer / Solicitor</label>
        <input className="form-input" value={lawyerName} onChange={e => setLawyerName(e.target.value)}
          placeholder="e.g. Babatunde Adewale Esq. (SAN)" disabled={!canEdit} />
        <div className="form-hint">Name of the independent property lawyer overseeing the campaign</div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION: Referral Programme
      ════════════════════════════════════════════════════════════════════════ */}
      <SubLabel icon="fa-share-nodes">Referral Programme</SubLabel>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Referral Cash Reward (₦/referral)</label>
          <input type="number" className="form-input" value={referralReward} onChange={e => setRefReward(e.target.value)} placeholder="300" min={0} disabled={!canEdit} />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Free Ticket per N referrals</label>
          <input type="number" className="form-input" value={referralFreeN} onChange={e => setRefFreeN(e.target.value)} placeholder="5" min={1} disabled={!canEdit} />
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION: Mandatory Skill Questions
      ════════════════════════════════════════════════════════════════════════ */}
      <SectionLabel>Mandatory Skill Questions</SectionLabel>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 260, padding: '0.75rem 1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius)', fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
          <i className="fa-solid fa-circle-info" style={{ color: 'var(--info)', marginRight: '0.375rem' }} />
          Participants must answer one of these questions correctly before buying tickets. Add <strong>at least 5 unique questions</strong> per campaign. Each question needs 4 answer options with one marked as correct. Keep questions non-trivial — avoid answers that are obvious from the campaign page.
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={generateQuestionsWithAI}
            disabled={generatingQuestions}
            className="btn btn-gold btn-sm"
            style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
            title={!initialData?.id ? 'Save campaign first to generate questions' : 'Generate 5 questions using AI'}
          >
            {generatingQuestions
              ? <><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '0.375rem' }} />Generating…</>
              : <><i className="fa-solid fa-wand-magic-sparkles" style={{ marginRight: '0.375rem' }} />Generate with AI</>
            }
          </button>
        )}
      </div>
      {generateError && (
        <div style={{ marginBottom: '1rem', padding: '0.65rem 1rem', background: '#fef2f2', borderRadius: 'var(--radius)', fontSize: '0.8125rem', color: 'var(--error)', border: '1px solid #fecaca' }}>
          <i className="fa-solid fa-circle-exclamation" style={{ marginRight: '0.375rem' }} />{generateError}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {skillQuestions.map((q, qIdx) => (
          <div key={qIdx} style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', border: '1px solid var(--border-light)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
              <span style={{ fontSize: '0.8125rem', fontWeight: 800, color: 'var(--text-primary)' }}>Question {qIdx + 1}</span>
              {canEdit && skillQuestions.length > 5 && (
                <button type="button" onClick={() => removeQuestion(qIdx)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.875rem', padding: '0.25rem' }}
                  title="Remove question">
                  <i className="fa-solid fa-trash" />
                </button>
              )}
            </div>
            <div className="form-group">
              <input className="form-input" value={q.question}
                onChange={e => updateQuestion(qIdx, 'question', e.target.value)}
                placeholder="Enter your question here..." required disabled={!canEdit}
                style={{ background: '#fff' }} />
            </div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
              Answer Options — select the correct one
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {q.options.map((opt, optIdx) => (
                <div key={optIdx} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', width: 16, textAlign: 'center', flexShrink: 0 }}>
                    {OPTION_LETTERS[optIdx]}
                  </span>
                  <input type="radio" name={`correct-${qIdx}`}
                    checked={q.correctIndex === optIdx}
                    onChange={() => updateQuestion(qIdx, 'correctIndex', optIdx)}
                    title="Mark as correct answer"
                    style={{ width: 16, height: 16, accentColor: 'var(--green-primary)', flexShrink: 0, cursor: 'pointer' }}
                    disabled={!canEdit} />
                  <input className="form-input" value={opt}
                    onChange={e => updateOption(qIdx, optIdx, e.target.value)}
                    placeholder={`Option ${OPTION_LETTERS[optIdx]}...`}
                    required disabled={!canEdit}
                    style={{ flex: 1, background: '#fff', borderColor: q.correctIndex === optIdx ? 'var(--green-primary)' : undefined }} />
                  {q.correctIndex === optIdx && (
                    <span className="badge badge-green" style={{ fontSize: '0.7rem', flexShrink: 0 }}>Correct</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
        {canEdit && (
          <button type="button" onClick={addQuestion} className="btn btn-outline btn-sm">
            <i className="fa-solid fa-plus" style={{ marginRight: '0.375rem' }} />Add Question
          </button>
        )}
        <div style={{ fontSize: '0.8125rem', color: skillQuestions.length >= 5 ? 'var(--green-primary)' : 'var(--text-muted)', fontWeight: 600 }}>
          {skillQuestions.length} question{skillQuestions.length !== 1 ? 's' : ''} added
          {skillQuestions.length >= 5 && <> <i className="fa-solid fa-check" /></>}
        </div>
      </div>

      {/* ── Submit buttons ──────────────────────────────────────────────────── */}
      {canEdit && (
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '1.5rem', marginTop: '1.5rem', borderTop: '1px solid var(--border-light)' }}>
          <button type="button" onClick={() => router.push('/admin/campaigns')} className="btn btn-outline">
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving
              ? <><i className="fa-solid fa-spinner fa-spin" style={{ marginRight: '0.4rem' }} />Saving…</>
              : <><i className={`fa-solid ${mode === 'create' ? 'fa-plus' : 'fa-floppy-disk'}`} style={{ marginRight: '0.4rem' }} />{mode === 'create' ? 'Create Campaign' : 'Save Changes'}</>
            }
          </button>
        </div>
      )}

      {!canEdit && (
        <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: '#fef9c3', border: '1px solid #fde047', borderRadius: 'var(--radius)', fontSize: '0.8125rem', color: '#a16207' }}>
          <i className="fa-solid fa-lock" style={{ marginRight: '0.4rem' }} />
          This campaign is {currentStatus.toLowerCase()} and cannot be edited.
        </div>
      )}
    </form>
  );
}
