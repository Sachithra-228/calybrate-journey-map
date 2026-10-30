// Shared backend settings (Supabase). Leave both empty to run in local demo mode (data stays in this browser only).
// These two values are public by design: the publishable key can only do what the row-level-security rules in
// supabase/schema.sql allow, and only signed-in Sandbox / Liveroom accounts pass those rules.
window.CALYBRATE_CONFIG = {
  supabaseUrl: 'https://xbqomzljozkjjfuxrwkc.supabase.co',
  supabaseAnonKey: 'sb_publishable_hsAnuAH_OwFewCw-NUPoCA_aYpY-JW6'
};
