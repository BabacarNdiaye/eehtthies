export interface User {
    id: number;
    name: string;
    email: string;
    phone?: string | null;
    avatar?: string | null;
    position?: string | null;
    department?: string | null;
    hire_date?: string | null;
    monthly_salary?: number | string | null;
    manager_id?: number | null;
    personal_email?: string | null;
    is_active?: boolean;
    email_verified_at?: string;
}

export interface SiteSettings {
    site_name: string;
    site_short_name: string;
    site_tagline?: string | null;
    site_logo?: string | null;
    site_email?: string | null;
    site_phone?: string | null;
    site_address?: string | null;
    opening_hours?: string | null;
    facebook_url?: string | null;
    instagram_url?: string | null;
    whatsapp_url?: string | null;
    linkedin_url?: string | null;
    youtube_url?: string | null;
    director_name?: string | null;
    director_role?: string | null;
    director_message?: string | null;
    director_photo?: string | null;
    about_photo?: string | null;
}

export interface Flash {
    success?: string | null;
    error?: string | null;
}

/** Profil affiché dans la feuille Menu et l'en-tête des espaces élève, enseignant et parent (null ailleurs). */
export interface PortalProfile {
    kind: 'student' | 'teacher' | 'parent';
    name: string;
    subtitle: string | null;
    photo: string | null;
    matricule: string | null;
}

export type PageProps<
    T extends Record<string, unknown> = Record<string, unknown>,
> = T & {
    auth: {
        user: User | null;
        roles: string[];
        permissions: string[];
    };
    flash: Flash;
    siteSettings: SiteSettings;
    vapidPublicKey?: string;
    portalProfile?: PortalProfile | null;
};

export interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

export interface Paginated<T> {
    data: T[];
    links: PaginationLink[];
    current_page: number;
    last_page: number;
    total: number;
    per_page: number;
    from: number | null;
    to: number | null;
}

export interface Formation {
    id: number;
    name: string;
    code: string;
    slug: string;
    diploma?: string | null;
    diploma_recognition?: string | null;
    level?: string | null;
    duration?: string | null;
    description?: string | null;
    admission_conditions?: string | null;
    registration_fee: string | number;
    tuition_fee: string | number;
    program?: string | null;
    objectives?: string | null;
    career_prospects?: string | null;
    capacity?: number | null;
    next_intake_date?: string | null;
    image?: string | null;
    is_active: boolean;
    order: number;
    students_count?: number;
}

export interface Teacher {
    id: number;
    attachments?: Attachment[];
    user_id?: number | null;
    matricule: string;
    first_name: string;
    last_name: string;
    photo?: string | null;
    phone?: string | null;
    email?: string | null;
    professional_email?: string | null;
    address?: string | null;
    specialty?: string | null;
    diplomas?: string | null;
    experience_years?: number | null;
    status: 'actif' | 'inactif' | 'suspendu';
    payment_type: 'fixe' | 'horaire';
    monthly_salary?: number | string | null;
    hourly_rate?: number | string | null;
    subjects?: { id: number; name: string }[];
}

export interface Student {
    id: number;
    matricule: string;
    photo?: string | null;
    first_name: string;
    last_name: string;
    birth_date?: string | null;
    birth_place?: string | null;
    gender?: 'M' | 'F' | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    professional_email?: string | null;
    formation_id?: number | null;
    school_class_id?: number | null;
    academic_year_id?: number | null;
    guardian_name?: string | null;
    guardian_phone?: string | null;
    guardian_email?: string | null;
    emergency_contact?: string | null;
    blood_group?: string | null;
    allergies?: string | null;
    chronic_conditions?: string | null;
    current_medication?: string | null;
    health_insurance?: string | null;
    doctor_name?: string | null;
    doctor_phone?: string | null;
    health_notes?: string | null;
    status: 'actif' | 'suspendu' | 'abandon' | 'diplome' | 'transfere' | 'exclu';
    is_repeating?: boolean;
    diploma_number?: string | null;
    diploma_issued_at?: string | null;
    training_attestation_number?: string | null;
    training_attestation_issued_at?: string | null;
    qr_token?: string | null;
    user_id?: number | null;
    parent_user_id?: number | null;
    graduation_year?: number | null;
    current_position?: string | null;
    current_employer?: string | null;
    linkedin_url?: string | null;
    alumni_bio?: string | null;
    is_alumni_public?: boolean;
    formation?: { id: number; name: string } | null;
    // Laravel serializes camelCase relation names as snake_case JSON keys by default.
    school_class?: { id: number; name: string } | null;
    academic_year?: { id: number; label: string } | null;
    documents?: StudentDocument[];
}

export interface Attachment {
    id: number;
    original_name: string;
    mime_type?: string | null;
    size: number;
    uploaded_by?: number | null;
    uploader?: { id: number; name: string } | null;
    created_at: string;
}

export interface StudentDocument {
    id: number;
    student_id: number;
    type: string;
    title: string;
    file_path: string;
    uploaded_by?: number | null;
    uploader?: { id: number; name: string } | null;
    created_at: string;
}

export interface Candidature {
    id: number;
    reference: string;
    formation_id: number;
    first_name: string;
    last_name: string;
    birth_date?: string | null;
    gender?: 'M' | 'F' | null;
    email: string;
    phone: string;
    address?: string | null;
    guardian_name?: string | null;
    guardian_phone?: string | null;
    last_school?: string | null;
    last_diploma?: string | null;
    motivation?: string | null;
    status: string;
    admin_notes?: string | null;
    source?: string | null;
    interview_at?: string | null;
    submitted_at?: string | null;
    created_at: string;
    formation?: { id: number; name: string } | null;
}

export interface NewsArticle {
    id: number;
    title: string;
    slug: string;
    excerpt?: string | null;
    content: string;
    image?: string | null;
    category?: string | null;
    source: 'manuel' | 'facebook';
    facebook_post_url?: string | null;
    is_published: boolean;
    is_featured: boolean;
    published_at?: string | null;
    photos?: NewsArticlePhoto[];
}

export interface NewsArticlePhoto {
    id: number;
    news_article_id: number;
    path: string;
    caption?: string | null;
    order: number;
}

export interface EventItem {
    id: number;
    title: string;
    slug: string;
    description?: string | null;
    image?: string | null;
    location?: string | null;
    start_at: string;
    end_at?: string | null;
    is_published: boolean;
}

export interface GalleryMediaItem {
    id: number;
    gallery_id: number;
    type: 'image' | 'video';
    path: string;
    caption?: string | null;
}

export interface Gallery {
    id: number;
    title: string;
    slug: string;
    category?: string | null;
    cover_image?: string | null;
    is_published: boolean;
    media?: GalleryMediaItem[];
    media_count?: number;
}

export interface Partner {
    id: number;
    name: string;
    logo?: string | null;
    type?: string | null;
    description?: string | null;
    website?: string | null;
    contact_name?: string | null;
    contact_email?: string | null;
    contact_phone?: string | null;
    is_published: boolean;
}

export interface Testimonial {
    id: number;
    name: string;
    photo?: string | null;
    role?: string | null;
    formation_id?: number | null;
    content: string;
    rating: number;
    is_published: boolean;
    formation?: { id: number; name: string } | null;
}

export interface Faq {
    id: number;
    question: string;
    answer: string;
    category?: string | null;
    order: number;
    is_published: boolean;
}

export interface Slider {
    id: number;
    title: string;
    subtitle?: string | null;
    image: string;
    button_text?: string | null;
    button_link?: string | null;
    order: number;
    is_active: boolean;
}

export interface ContactMessage {
    id: number;
    name: string;
    email: string;
    phone?: string | null;
    subject?: string | null;
    message: string;
    is_read: boolean;
    created_at: string;
}

export interface AcademicYear {
    id: number;
    label: string;
    start_date: string;
    end_date: string;
    is_current: boolean;
}

export interface SchoolClass {
    id: number;
    name: string;
    formation_id: number;
    academic_year_id: number;
    capacity?: number | null;
    next_class_id?: number | null;
    formation_level_id?: number | null;
}

export interface Subject {
    id: number;
    name: string;
    code?: string | null;
    formation_id?: number | null;
    coefficient: number;
}

export interface Room {
    id: number;
    name: string;
    type?: string | null;
    capacity?: number | null;
}

export interface TimetableEntry {
    id: number;
    school_class_id: number;
    subject_id: number;
    teacher_id?: number | null;
    room_id?: number | null;
    day_of_week: number;
    start_time: string;
    end_time: string;
    subject?: { id: number; name: string } | null;
    teacher?: { id: number; first_name: string; last_name: string } | null;
    room?: { id: number; name: string } | null;
    // Laravel sérialise les relations en snake_case (schoolClass → school_class).
    school_class?: { id: number; name: string } | null;
}

export interface Attendance {
    id: number;
    student_id: number;
    school_class_id: number;
    subject_id?: number | null;
    timetable_entry_id?: number | null;
    date: string;
    status: 'present' | 'absent' | 'retard' | 'absence_justifiee';
    checked_in_at?: string | null;
    justification?: string | null;
    student?: { id: number; matricule: string; first_name: string; last_name: string } | null;
    subject?: { id: number; name: string } | null;
    // Laravel serializes camelCase relation names (schoolClass, timetableEntry) as
    // snake_case JSON keys by default — these match the real payload shape, not the PHP method names.
    school_class?: { id: number; name: string } | null;
    timetable_entry?: { id: number; start_time: string; end_time: string } | null;
}

export interface LessonLog {
    id: number;
    timetable_entry_id?: number | null;
    teacher_id: number;
    school_class_id: number;
    subject_id: number;
    date: string;
    content: string;
    homework?: string | null;
    teacher?: { id: number; first_name: string; last_name: string } | null;
    school_class?: { id: number; name: string } | null;
    subject?: { id: number; name: string } | null;
}

export interface Exam {
    id: number;
    title: string;
    type: 'devoir' | 'interrogation' | 'controle' | 'examen' | 'examen_pratique' | 'examen_theorique';
    session: 'normale' | 'rattrapage';
    school_class_id: number;
    subject_id: number;
    room_id?: number | null;
    academic_year_id?: number | null;
    term?: string | null;
    exam_date: string;
    start_time?: string | null;
    end_time?: string | null;
    max_score: string | number;
    coefficient: string | number;
    is_published: boolean;
    school_class?: { id: number; name: string } | null;
    subject?: { id: number; name: string } | null;
    invigilators?: { id: number; first_name: string; last_name: string }[];
    created_by?: number | null;
    is_mine?: boolean;
    can_grade?: boolean;
}

/** Statut de l'élève à une épreuve : il décide de ce qu'une note manquante vaut au bulletin. */
export type GradeStatus = 'present' | 'absent_justifie' | 'absent_non_justifie';

export interface Grade {
    id: number;
    exam_id: number;
    student_id: number;
    score?: string | number | null;
    status?: GradeStatus;
    is_absent: boolean;
    comment?: string | null;
}

export interface ReportCard {
    id: number;
    student_id: number;
    school_class_id: number;
    academic_year_id: number;
    term: string;
    average?: string | number | null;
    rank?: number | null;
    class_size?: number | null;
    class_average?: string | number | null;
    previous_term_average?: string | number | null;
    annual_average?: string | number | null;
    annual_rank?: number | null;
    retard_count?: number;
    absence_count?: number;
    unjustified_absence_count?: number;
    decision: 'admis' | 'redouble' | 'exclu' | 'rattrapage' | 'non_defini';
    mention?: 'felicitations' | 'encouragement' | 'tableau_honneur' | 'avertissement' | 'blame' | null;
    general_appreciation?: string | null;
    qr_token: string;
    is_published: boolean;
    generated_at?: string | null;
    student?: { id: number; first_name: string; last_name: string; matricule: string } | null;
    school_class?: { id: number; name: string } | null;
    academic_year?: { id: number; label: string } | null;
}

export interface SubjectBreakdown {
    subject_id: number;
    subject: string;
    coefficient: number;
    devoir: number | null;
    composition: number | null;
    moy20: number | null;
    moyx: number | null;
    appreciation: string | null;
    rank?: number | null;
    class_size?: number | null;
    /** Faux quand rien ne compte pour l'élève dans cette matière : voir `status`. */
    evaluated?: boolean;
    /** evaluated · absence_justifiee (toutes les épreuves justifiées) · no_evaluation (aucune épreuve publiée). */
    status?: 'evaluated' | 'absence_justifiee' | 'no_evaluation';
}

export interface Payment {
    id: number;
    receipt_number: string;
    invoice_id: number;
    amount: string | number;
    method: 'especes' | 'virement' | 'mobile_money' | 'autre';
    /** Canal précis (Wave, Orange Money, chèque…) ; absent des anciens paiements, qui n'ont que la famille `method`. */
    channel?: string | null;
    /** Ce qu'il restait à payer sur la facture juste après ce paiement (absent des anciens paiements). */
    balance_after?: string | number | null;
    reference?: string | null;
    paid_at: string;
    notes?: string | null;
    received_by?: number | null;
    receivedBy?: { id: number; name: string } | null;
}

export interface Invoice {
    id: number;
    attachments?: Attachment[];
    reference: string;
    student_id: number;
    academic_year_id?: number | null;
    type: 'inscription' | 'scolarite' | 'mensualite' | 'autre';
    period_month?: number | null;
    label: string;
    amount: string | number;
    discount: string | number;
    due_date?: string | null;
    notes?: string | null;
    student?: { id: number; first_name: string; last_name: string; matricule: string } | null;
    academic_year?: { id: number; label: string } | null;
    payments?: Payment[];
    payments_sum_amount?: string | number | null;
    computed_status?: 'payee' | 'partielle' | 'impayee';
    computed_balance?: number;
    computed_paid?: number;
}

/** Paiement en ligne offert aux espaces élève et parent : l'adresse de démarrage et les modes que propose le pilote actif. */
export interface OnlinePaymentConfig {
    start_url: string;
    channels: Record<string, string>;
}

export interface Expense {
    id: number;
    category: string;
    label: string;
    amount: string | number;
    expense_date: string;
    payment_method: 'especes' | 'virement' | 'mobile_money' | 'autre';
    supplier_name?: string | null;
    notes?: string | null;
    attachments?: Attachment[];
}

export interface Supplier {
    id: number;
    name: string;
    contact_name?: string | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    products_count?: number;
}

export interface Product {
    id: number;
    name: string;
    category: string;
    unit: string;
    unit_cost: string | number;
    quantity_in_stock: string | number;
    min_threshold: string | number;
    supplier_id?: number | null;
    is_active: boolean;
    supplier?: { id: number; name: string } | null;
    is_low_stock?: boolean;
    valuation?: number;
}

export interface StockMovement {
    id: number;
    product_id: number;
    type: 'entree' | 'sortie' | 'ajustement';
    quantity: string | number;
    unit_cost?: string | number | null;
    reference?: string | null;
    reason?: string | null;
    movement_date: string;
    product?: { id: number; name: string; unit: string } | null;
    recordedBy?: { id: number; name: string } | null;
}

export interface PracticalSessionItem {
    id: number;
    practical_session_id: number;
    product_id: number;
    quantity_used: string | number;
    unit_cost_at_time: string | number;
    product?: Product | null;
}

export interface PracticalSession {
    id: number;
    title: string;
    school_class_id: number;
    subject_id?: number | null;
    teacher_id?: number | null;
    session_date: string;
    notes?: string | null;
    school_class?: { id: number; name: string } | null;
    subject?: { id: number; name: string } | null;
    teacher?: { id: number; first_name: string; last_name: string } | null;
    items?: PracticalSessionItem[];
    items_count?: number;
    estimated_cost?: number;
}

export interface InternshipOffer {
    id: number;
    partner_id: number;
    formation_id?: number | null;
    title: string;
    description?: string | null;
    positions_available: number;
    start_date?: string | null;
    end_date?: string | null;
    expires_at?: string | null;
    is_published: boolean;
    partner?: { id: number; name: string; logo?: string | null } | null;
    formation?: { id: number; name: string } | null;
    internships_count?: number;
}

export interface Internship {
    id: number;
    attachments?: Attachment[];
    student_id: number;
    partner_id: number;
    internship_offer_id?: number | null;
    title: string;
    start_date: string;
    end_date?: string | null;
    supervisor_name?: string | null;
    supervisor_phone?: string | null;
    supervisor_email?: string | null;
    status: 'en_cours' | 'termine' | 'abandonne';
    evaluation_score?: string | number | null;
    evaluation_appreciation?: string | null;
    attestation_number?: string | null;
    student?: { id: number; first_name: string; last_name: string; matricule: string } | null;
    partner?: { id: number; name: string } | null;
}

export interface JobOffer {
    id: number;
    partner_id: number;
    title: string;
    description?: string | null;
    contract_type: 'cdi' | 'cdd' | 'stage' | 'saisonnier';
    location?: string | null;
    expires_at?: string | null;
    is_published: boolean;
    partner?: { id: number; name: string; logo?: string | null } | null;
}

export interface Role {
    id: number;
    name: string;
    permissions_count?: number;
    users_count?: number;
}

export interface RoleDetail {
    id: number;
    name: string;
    permissions: string[];
}

export interface SentEmail {
    id: number;
    subject: string;
    body: string;
    recipients: { email: string; name?: string | null }[];
    recipients_count: number;
    failed_count: number;
    sender?: { id: number; name: string } | null;
    created_at: string;
}
