import { 
  Award, BookOpen, Code, GraduationCap, Crown, Flame, Shield, 
  Star, Heart, Zap, Trophy, Users, Sparkles, Coffee, 
  Briefcase, Stethoscope, Scale, Cpu, Wrench, Building2, Landmark
} from "lucide-react";

export type BadgeCategory = "conquista" | "curso" | "periodo" | "cargo" | "especial" | "universidade";

export interface UserBadge {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  category: BadgeCategory;
  color: string; // tailwind text color class using semantic tokens
  bgColor: string;
  rarity: "comum" | "raro" | "épico" | "lendário";
}

export const allBadges: UserBadge[] = [
  // Conquistas
  { id: "first-post", name: "Primeiro Post", description: "Fez o primeiro post", icon: BookOpen, category: "conquista", color: "text-primary", bgColor: "bg-primary/15", rarity: "comum" },
  { id: "100-posts", name: "Centurião", description: "100 posts publicados", icon: Trophy, category: "conquista", color: "text-neon-orange", bgColor: "bg-neon-orange/15", rarity: "épico" },
  { id: "1-year", name: "Veterano", description: "1 ano no Uniqo", icon: Award, category: "conquista", color: "text-neon-pink", bgColor: "bg-neon-pink/15", rarity: "raro" },
  { id: "first-match", name: "Match!", description: "Primeiro match feito", icon: Heart, category: "conquista", color: "text-neon-pink", bgColor: "bg-neon-pink/15", rarity: "comum" },
  { id: "popular", name: "Popular", description: "Mais de 500 curtidas", icon: Flame, category: "conquista", color: "text-neon-orange", bgColor: "bg-neon-orange/15", rarity: "épico" },
  { id: "helper", name: "Ajudante", description: "Ajudou 50 pessoas", icon: Star, category: "conquista", color: "text-primary", bgColor: "bg-primary/15", rarity: "raro" },
  { id: "streak-7", name: "On Fire", description: "7 dias seguidos ativo", icon: Zap, category: "conquista", color: "text-neon-orange", bgColor: "bg-neon-orange/15", rarity: "comum" },
  { id: "coffee-lover", name: "Café Lover", description: "Postou às 3 da manhã", icon: Coffee, category: "conquista", color: "text-muted-foreground", bgColor: "bg-muted/50", rarity: "raro" },

  // Cursos (específicos)
  { id: "curso-administracao", name: "Administração", description: "Curso de Administração", icon: Briefcase, category: "curso", color: "text-neon-orange", bgColor: "bg-neon-orange/15", rarity: "comum" },
  { id: "curso-arquitetura", name: "Arquitetura", description: "Curso de Arquitetura e Urbanismo", icon: Wrench, category: "curso", color: "text-primary", bgColor: "bg-primary/15", rarity: "comum" },
  { id: "curso-biomedicina", name: "Biomedicina", description: "Curso de Biomedicina", icon: Stethoscope, category: "curso", color: "text-primary", bgColor: "bg-primary/15", rarity: "comum" },
  { id: "curso-computacao", name: "Computação", description: "Curso de Ciência da Computação", icon: Code, category: "curso", color: "text-primary", bgColor: "bg-primary/15", rarity: "comum" },
  { id: "curso-contabeis", name: "Contábeis", description: "Curso de Ciências Contábeis", icon: Briefcase, category: "curso", color: "text-neon-orange", bgColor: "bg-neon-orange/15", rarity: "comum" },
  { id: "curso-design", name: "Design", description: "Curso de Design Gráfico", icon: Sparkles, category: "curso", color: "text-neon-pink", bgColor: "bg-neon-pink/15", rarity: "comum" },
  { id: "curso-direito", name: "Direito", description: "Curso de Direito", icon: Scale, category: "curso", color: "text-neon-pink", bgColor: "bg-neon-pink/15", rarity: "comum" },
  { id: "curso-educacao-fisica", name: "Educação Física", description: "Curso de Educação Física", icon: Zap, category: "curso", color: "text-primary", bgColor: "bg-primary/15", rarity: "comum" },
  { id: "curso-enfermagem", name: "Enfermagem", description: "Curso de Enfermagem", icon: Stethoscope, category: "curso", color: "text-primary", bgColor: "bg-primary/15", rarity: "comum" },
  { id: "curso-eng-civil", name: "Eng. Civil", description: "Curso de Engenharia Civil", icon: Wrench, category: "curso", color: "text-neon-orange", bgColor: "bg-neon-orange/15", rarity: "comum" },
  { id: "curso-eng-producao", name: "Eng. Produção", description: "Curso de Engenharia de Produção", icon: Wrench, category: "curso", color: "text-neon-orange", bgColor: "bg-neon-orange/15", rarity: "comum" },
  { id: "curso-eng-software", name: "Eng. Software", description: "Curso de Engenharia de Software", icon: Cpu, category: "curso", color: "text-primary", bgColor: "bg-primary/15", rarity: "comum" },
  { id: "curso-eng-eletrica", name: "Eng. Elétrica", description: "Curso de Engenharia Elétrica", icon: Wrench, category: "curso", color: "text-neon-orange", bgColor: "bg-neon-orange/15", rarity: "comum" },
  { id: "curso-eng-mecanica", name: "Eng. Mecânica", description: "Curso de Engenharia Mecânica", icon: Wrench, category: "curso", color: "text-neon-orange", bgColor: "bg-neon-orange/15", rarity: "comum" },
  { id: "curso-farmacia", name: "Farmácia", description: "Curso de Farmácia", icon: Stethoscope, category: "curso", color: "text-primary", bgColor: "bg-primary/15", rarity: "comum" },
  { id: "curso-fisioterapia", name: "Fisioterapia", description: "Curso de Fisioterapia", icon: Stethoscope, category: "curso", color: "text-primary", bgColor: "bg-primary/15", rarity: "comum" },
  { id: "curso-fonoaudiologia", name: "Fono", description: "Curso de Fonoaudiologia", icon: Stethoscope, category: "curso", color: "text-cyan-400", bgColor: "bg-cyan-400/15", rarity: "comum" },
  { id: "curso-marketing", name: "Marketing", description: "Curso de Marketing", icon: Briefcase, category: "curso", color: "text-neon-pink", bgColor: "bg-neon-pink/15", rarity: "comum" },
  { id: "curso-medicina", name: "Medicina", description: "Curso de Medicina", icon: Stethoscope, category: "curso", color: "text-primary", bgColor: "bg-primary/15", rarity: "comum" },
  { id: "curso-veterinaria", name: "Vet", description: "Curso de Medicina Veterinária", icon: Stethoscope, category: "curso", color: "text-primary", bgColor: "bg-primary/15", rarity: "comum" },
  { id: "curso-nutricao", name: "Nutrição", description: "Curso de Nutrição", icon: Stethoscope, category: "curso", color: "text-primary", bgColor: "bg-primary/15", rarity: "comum" },
  { id: "curso-odontologia", name: "Odonto", description: "Curso de Odontologia", icon: Stethoscope, category: "curso", color: "text-primary", bgColor: "bg-primary/15", rarity: "comum" },
  { id: "curso-pedagogia", name: "Pedagogia", description: "Curso de Pedagogia", icon: BookOpen, category: "curso", color: "text-neon-pink", bgColor: "bg-neon-pink/15", rarity: "comum" },
  { id: "curso-psicologia", name: "Psicologia", description: "Curso de Psicologia", icon: Heart, category: "curso", color: "text-neon-pink", bgColor: "bg-neon-pink/15", rarity: "comum" },
  { id: "curso-publicidade", name: "Publicidade", description: "Curso de Publicidade e Propaganda", icon: Sparkles, category: "curso", color: "text-neon-pink", bgColor: "bg-neon-pink/15", rarity: "comum" },
  { id: "curso-sistemas-info", name: "Sistemas", description: "Curso de Sistemas de Informação", icon: Cpu, category: "curso", color: "text-primary", bgColor: "bg-primary/15", rarity: "comum" },

  // Cargos
  { id: "admin", name: "Admin", description: "Administrador do Uniqo", icon: Shield, category: "cargo", color: "text-neon-pink", bgColor: "bg-neon-pink/15", rarity: "lendário" },
  { id: "mod", name: "Moderador", description: "Moderador de comunidade", icon: Shield, category: "cargo", color: "text-primary", bgColor: "bg-primary/15", rarity: "épico" },
  { id: "professor", name: "Professor", description: "Docente verificado", icon: GraduationCap, category: "cargo", color: "text-neon-orange", bgColor: "bg-neon-orange/15", rarity: "épico" },
  { id: "rep-turma", name: "Representante", description: "Representante de turma", icon: Users, category: "cargo", color: "text-primary", bgColor: "bg-primary/15", rarity: "raro" },

  // Períodos — ícones por raridade: Sparkles (comum), Flame (raro), Crown (épico), GraduationCap (lendário)
  { id: "periodo-1", name: "1º Período", description: "Calouro!", icon: Star, category: "periodo", color: "text-primary", bgColor: "bg-primary/15", rarity: "comum" },
  { id: "periodo-2", name: "2º Período", description: "Segundo período", icon: Sparkles, category: "periodo", color: "text-primary", bgColor: "bg-primary/15", rarity: "comum" },
  { id: "periodo-3", name: "3º Período", description: "Terceiro período", icon: Sparkles, category: "periodo", color: "text-primary", bgColor: "bg-primary/15", rarity: "comum" },
  { id: "periodo-4", name: "4º Período", description: "Quarto período", icon: Sparkles, category: "periodo", color: "text-primary", bgColor: "bg-primary/15", rarity: "comum" },
  { id: "periodo-5", name: "5º Período", description: "Quinto período", icon: Flame, category: "periodo", color: "text-neon-orange", bgColor: "bg-neon-orange/15", rarity: "raro" },
  { id: "periodo-6", name: "6º Período", description: "Sexto período", icon: Flame, category: "periodo", color: "text-neon-orange", bgColor: "bg-neon-orange/15", rarity: "raro" },
  { id: "periodo-7", name: "7º Período", description: "Sétimo período", icon: Flame, category: "periodo", color: "text-neon-orange", bgColor: "bg-neon-orange/15", rarity: "raro" },
  { id: "periodo-8", name: "8º Período", description: "Oitavo período", icon: Crown, category: "periodo", color: "text-neon-pink", bgColor: "bg-neon-pink/15", rarity: "épico" },
  { id: "periodo-9", name: "9º Período", description: "Nono período", icon: Crown, category: "periodo", color: "text-neon-pink", bgColor: "bg-neon-pink/15", rarity: "épico" },
  { id: "periodo-10", name: "10º Período", description: "Décimo período", icon: Crown, category: "periodo", color: "text-neon-pink", bgColor: "bg-neon-pink/15", rarity: "épico" },
  { id: "periodo-11", name: "11º Período", description: "Quase lá!", icon: GraduationCap, category: "periodo", color: "text-neon-pink", bgColor: "bg-neon-pink/15", rarity: "lendário" },
  { id: "periodo-12", name: "12º Período", description: "Último período!", icon: GraduationCap, category: "periodo", color: "text-neon-pink", bgColor: "bg-neon-pink/15", rarity: "lendário" },

  // Universidades de Teresina-PI
  { id: "uni-ufpi", name: "UFPI", description: "Universidade Federal do Piauí", icon: Landmark, category: "universidade", color: "text-blue-400", bgColor: "bg-blue-400/15", rarity: "comum" },
  { id: "uni-uespi", name: "UESPI", description: "Universidade Estadual do Piauí", icon: Landmark, category: "universidade", color: "text-red-400", bgColor: "bg-red-400/15", rarity: "comum" },
  { id: "uni-ifpi", name: "IFPI", description: "Instituto Federal do Piauí", icon: Landmark, category: "universidade", color: "text-green-400", bgColor: "bg-green-400/15", rarity: "comum" },
  { id: "uni-uninovafapi", name: "UNINOVAFAPI", description: "Centro Universitário UNINOVAFAPI", icon: Building2, category: "universidade", color: "text-blue-500", bgColor: "bg-blue-500/15", rarity: "comum" },
  { id: "uni-uninassau", name: "UNINASSAU", description: "Centro Universitário Maurício de Nassau", icon: Building2, category: "universidade", color: "text-orange-400", bgColor: "bg-orange-400/15", rarity: "comum" },
  { id: "uni-fsa", name: "FSA", description: "Faculdade Santo Agostinho", icon: Building2, category: "universidade", color: "text-purple-400", bgColor: "bg-purple-400/15", rarity: "comum" },
  { id: "uni-facid", name: "FACID", description: "Faculdade Integral Diferencial", icon: Building2, category: "universidade", color: "text-green-500", bgColor: "bg-green-500/15", rarity: "comum" },
  { id: "uni-chrisfapi", name: "CHRISFAPI", description: "Christus Faculdade do Piauí", icon: Building2, category: "universidade", color: "text-sky-400", bgColor: "bg-sky-400/15", rarity: "comum" },
  { id: "uni-estacio", name: "Estácio", description: "Faculdade Estácio de Teresina", icon: Building2, category: "universidade", color: "text-red-500", bgColor: "bg-red-500/15", rarity: "comum" },
  { id: "uni-unip", name: "UNIP", description: "Universidade Paulista", icon: Building2, category: "universidade", color: "text-yellow-400", bgColor: "bg-yellow-400/15", rarity: "comum" },
  { id: "uni-aespi", name: "AESPI", description: "Faculdade AESPI", icon: Building2, category: "universidade", color: "text-teal-400", bgColor: "bg-teal-400/15", rarity: "comum" },
  { id: "uni-faeme", name: "FAEME", description: "Faculdade do Meio Norte", icon: Building2, category: "universidade", color: "text-emerald-400", bgColor: "bg-emerald-400/15", rarity: "comum" },
  { id: "uni-cet", name: "CET", description: "Faculdade de Tecnologia de Teresina", icon: Building2, category: "universidade", color: "text-indigo-400", bgColor: "bg-indigo-400/15", rarity: "comum" },
  { id: "uni-fal", name: "FAL", description: "Faculdade Aliança", icon: Building2, category: "universidade", color: "text-pink-400", bgColor: "bg-pink-400/15", rarity: "comum" },
  { id: "uni-far", name: "FAR", description: "Faculdade Adelmar Rosado", icon: Building2, category: "universidade", color: "text-violet-400", bgColor: "bg-violet-400/15", rarity: "comum" },
  { id: "uni-novaunesc", name: "NOVAUNESC", description: "Faculdade NOVAUNESC", icon: Building2, category: "universidade", color: "text-cyan-400", bgColor: "bg-cyan-400/15", rarity: "comum" },
  { id: "uni-rsa", name: "R.Sá", description: "Faculdade R.Sá", icon: Building2, category: "universidade", color: "text-amber-400", bgColor: "bg-amber-400/15", rarity: "comum" },
  { id: "uni-undb", name: "UNDB", description: "UNDB Teresina", icon: Building2, category: "universidade", color: "text-lime-400", bgColor: "bg-lime-400/15", rarity: "comum" },

  // Especiais
  { id: "calouro", name: "Calouro", description: "Primeiro período!", icon: Sparkles, category: "especial", color: "text-primary", bgColor: "bg-primary/15", rarity: "comum" },
  { id: "destaque", name: "Destaque", description: "Destaque da semana", icon: Crown, category: "especial", color: "text-neon-orange", bgColor: "bg-neon-orange/15", rarity: "lendário" },
  { id: "og", name: "OG", description: "Usuário desde o beta", icon: Star, category: "especial", color: "text-neon-pink", bgColor: "bg-neon-pink/15", rarity: "lendário" },
  { id: "study-group", name: "Líder de Grupo", description: "Criou grupo de estudo", icon: Briefcase, category: "especial", color: "text-primary", bgColor: "bg-primary/15", rarity: "raro" },
];

// Config: quais badges cada user tem
export const userBadges: Record<string, string[]> = {
  "voce": ["first-post", "100-posts", "curso-ti", "1-year", "popular", "streak-7", "og"],
  "campus_oficial": ["admin", "destaque"],
  "prof_silva": ["professor", "curso-ti", "helper"],
  "maria silva": ["curso-code", "helper", "streak-7"],
  "joão pedro": ["curso-dir", "first-post"],
  "ana costa": ["curso-med", "calouro"],
  "lucas mendes": ["curso-eng", "study-group", "streak-7"],
};

export function getUserBadges(username: string): UserBadge[] {
  const ids = userBadges[username.toLowerCase()] || [];
  return ids.map(id => allBadges.find(b => b.id === id)!).filter(Boolean);
}

// Name color based on highest-priority badge (cargo > especial > curso)
const nameColorPriority: Record<string, string> = {
  "admin": "text-neon-pink name-glow-pink",
  "destaque": "text-neon-orange name-glow-orange",
  "og": "text-neon-pink name-glow-pink",
  "mod": "text-primary name-glow-primary",
  "professor": "text-neon-orange name-glow-orange",
  "rep-turma": "text-primary name-glow-primary",
};

export function getNameColor(badges: UserBadge[]): string | null {
  for (const badge of badges) {
    if (nameColorPriority[badge.id]) return nameColorPriority[badge.id];
  }
  return null;
}

// Course color mapping
const courseColorMap: Record<string, string> = {
  "medicina": "text-emerald-400 name-glow-emerald",
  "direito": "text-neon-pink name-glow-pink",
  "eng": "text-neon-orange name-glow-orange",
  "computação": "text-primary name-glow-primary",
  "software": "text-primary name-glow-primary",
  "sistemas": "text-primary name-glow-primary",
  "design": "text-violet-400 name-glow-violet",
  "psicologia": "text-pink-400 name-glow-pink",
  "administração": "text-amber-400 name-glow-amber",
  "marketing": "text-rose-400 name-glow-pink",
  "farmácia": "text-teal-400 name-glow-emerald",
  "enfermagem": "text-cyan-400 name-glow-cyan",
  "nutrição": "text-lime-400 name-glow-emerald",
  "odontologia": "text-sky-400 name-glow-primary",
  "pedagogia": "text-indigo-400 name-glow-violet",
  "educação": "text-indigo-400 name-glow-violet",
  "veterinária": "text-emerald-400 name-glow-emerald",
  "biomedicina": "text-teal-400 name-glow-emerald",
  "fisioterapia": "text-cyan-400 name-glow-cyan",
  "fonoaudiologia": "text-cyan-400 name-glow-cyan",
  "contábeis": "text-amber-400 name-glow-amber",
  "publicidade": "text-rose-400 name-glow-pink",
  "arquitetura": "text-violet-400 name-glow-violet",
};

export function getCourseColor(course: string): string {
  const lower = course.toLowerCase();
  for (const [key, color] of Object.entries(courseColorMap)) {
    if (lower.includes(key)) return color;
  }
  return "text-muted-foreground";
}
