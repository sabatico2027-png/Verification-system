sql
-- ============================================================================
-- منتدى السلام والسلم الدولي - منصة التحقق من الشهادات
-- Supabase Database Setup & Row Level Security (RLS) Policies
-- ============================================================================

-- 1. إنشاء جدول الشهادات الرئيسي (Certificates Table)
CREATE TABLE IF NOT EXISTS public.certificates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    cert_number VARCHAR(100) NOT NULL UNIQUE,
    recipient_name TEXT NOT NULL,
    event_name TEXT,
    issue_date DATE,
    template_url TEXT NOT NULL,
    pos_x NUMERIC DEFAULT 50,
    pos_y NUMERIC DEFAULT 48,
    font_size INT DEFAULT 38,
    text_color VARCHAR(30) DEFAULT '#0e3a2f',
    font_family VARCHAR(100) DEFAULT ''Tajawal', sans-serif',
    font_weight VARCHAR(20) DEFAULT '700',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- إنشاء كشاف للبحث السريع بالاسم ورقم الشهادة
CREATE INDEX IF NOT EXISTS idx_cert_search ON public.certificates (recipient_name, cert_number);

-- 2. تفعيل نظام الحماية RLS (Row Level Security)
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

-- 3. سياسة السماح للعموم والجمهور بالبحث والاطلاع فقط (Public Read Access)
CREATE POLICY "Public users can view published certificates" 
ON public.certificates 
FOR SELECT 
TO public 
USING (true);

-- 4. سياسة حصر عمليات الإضافة والتعديل والحذف على المشرف المصرح له فقط عبر بريده الإلكتروني
CREATE POLICY "Only authorized admin can insert certificates" 
ON public.certificates 
FOR INSERT 
TO authenticated 
WITH CHECK (
    auth.jwt() ->> 'email' = 'aleezalsapaei@gmail.com'
);

CREATE POLICY "Only authorized admin can update certificates" 
ON public.certificates 
FOR UPDATE 
TO authenticated 
USING (
    auth.jwt() ->> 'email' = 'aleezalsapaei@gmail.com'
);

CREATE POLICY "Only authorized admin can delete certificates" 
ON public.certificates 
FOR DELETE 
TO authenticated 
USING (
    auth.jwt() ->> 'email' = 'aleezalsapaei@gmail.com'
);

-- 5. إعداد مجلد التخزين للقوالب (Storage Bucket Setup)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('certificate-templates', 'certificate-templates', true)
ON CONFLICT (id) DO NOTHING;

-- سياسة قراءة الصور للجميع (Public Bucket Read)
CREATE POLICY "Public Access for certificate templates" 
ON storage.objects 
FOR SELECT 
TO public 
USING (bucket_id = 'certificate-templates');

-- سياسة رفع الصور للمشرف فقط
CREATE POLICY "Admin Upload Access for certificate templates" 
ON storage.objects 
FOR INSERT 
TO authenticated 
WITH CHECK (
    bucket_id = 'certificate-templates' AND
    auth.jwt() ->> 'email' = 'aleezalsapaei@gmail.com'
);
