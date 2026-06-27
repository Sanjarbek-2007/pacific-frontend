export const DOMAIN_CONFIG: Record<string, {
  color: string; light: string; emoji: string; label: string;
}> = {
  education: { color:'#2563A8', light:'#EBF2FE', emoji:'🎓', label:'Education' },
  work:      { color:'#0A7D55', light:'#E6F5EE', emoji:'💼', label:'Work' },
  legal:     { color:'#6D35C7', light:'#F0EBFE', emoji:'⚖️', label:'Legal' },
  finance:   { color:'#C47F17', light:'#FDF3DC', emoji:'💰', label:'Finance' },
  health:    { color:'#B83269', light:'#FEF0F4', emoji:'🏥', label:'Health' },
  family:    { color:'#C46010', light:'#FEF0DC', emoji:'🏠', label:'Family' },
};

export function getDomainConfig(domain?: string) {
  return DOMAIN_CONFIG[domain || 'education'] || DOMAIN_CONFIG.education;
}
