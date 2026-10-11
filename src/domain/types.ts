/** Les deux membres : « a » a installé le script Google, « b » a rejoint avec le lien d'invitation. */
export type MemberKey = 'a' | 'b';
/** Une dépense ou une catégorie est perso (à une membre) ou commune. */
export type Owner = MemberKey | 'commun';

export interface BaseRecord {
  id: string;
  type: string;
  /** Horodatage de la dernière modification (ms). Le plus récent gagne à la synchro. */
  updatedAt: number;
  /** Appareil qui a fait la dernière modification. Départage deux modifications à la même milliseconde. */
  by: string;
  deleted?: boolean;
  /** Numéro de révision donné par le script Google. */
  rev?: number;
}

export interface MemberRec extends BaseRecord {
  type: 'member';
  key: MemberKey;
  name: string;
  /** Plafond du mois, ou null si la membre n'en veut pas. */
  plafond: number | null;
}

export interface PrefsRec extends BaseRecord {
  type: 'prefs';
  /** Pourcentage du plafond à partir duquel une catégorie est « bientôt au plafond ». */
  seuil: number;
  alerteJours: number;
}

export interface CategoryRec extends BaseRecord {
  type: 'category';
  owner: Owner;
  name: string;
  color: string;
  plafond: number | null;
  order: number;
}

export interface ExpenseRec extends BaseRecord {
  type: 'expense';
  owner: Owner;
  /** AAAA-MM-JJ */
  date: string;
  amount: number;
  label: string;
  cat: string;
  /** Pour une dépense commune : qui a payé. */
  payer?: MemberKey;
  /** Pour une dépense commune : part de la membre « a », entre 0 et 1. */
  partA?: number;
  /** Dépense ajoutée toute seule par un abonnement : l'identifiant de cet abonnement. */
  subId?: string;
  createdAt: number;
}

export type Freq = 'semaine' | 'mois' | 'trimestre' | 'an';

export interface SubscriptionRec extends BaseRecord {
  type: 'subscription';
  owner: Owner;
  name: string;
  /** Montant de chaque prélèvement (après l'essai gratuit s'il y en a un). */
  amount: number;
  freq: Freq;
  /**
   * L'échéance saisie (AAAA-MM-JJ) : les suivantes s'en déduisent.
   * Pour un essai gratuit, c'est la fin de l'essai.
   */
  anchor: string;
  /** Préavis de résiliation, en jours. */
  preavis: number;
  essai: boolean;
  cat: string;
  payer?: MemberKey;
  partA?: number;
  alerte: boolean;
  alerteJours: number;
  /** Jour où l'abonnement a été résilié, ou null s'il court toujours. */
  resilieLe: string | null;
  createdAt: number;
}

/** Un remboursement entre les deux membres (« On est quittes »). */
export interface SettlementRec extends BaseRecord {
  type: 'settlement';
  date: string;
  /** La membre qui a remboursé l'autre. */
  from: MemberKey;
  amount: number;
  createdAt: number;
}

export type AnyRecord = MemberRec | PrefsRec | CategoryRec | ExpenseRec | SubscriptionRec | SettlementRec;

/** Les données vivantes (sans les enregistrements supprimés), prêtes pour les calculs. */
export interface Snapshot {
  members: Record<MemberKey, MemberRec>;
  prefs: PrefsRec;
  categories: CategoryRec[];
  expenses: ExpenseRec[];
  subscriptions: SubscriptionRec[];
  settlements: SettlementRec[];
}

export const other = (m: MemberKey): MemberKey => (m === 'a' ? 'b' : 'a');
