// Think Nest connection to Supabase.
// These two values are safe to be public: the security rules in the database decide what each person can see.
const SUPABASE_URL = 'https://hbyzzivwfrcytcnqivqi.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Jh0cFj46kwkjG2SYcch2xA_9o0NaD9J';
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
