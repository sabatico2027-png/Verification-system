-- 1. إنشاء جدول الشهادات
CREATE TABLE IF NOT EXISTS public.certificates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    recipient_name TEXT NOT NULL,
    cert_number TEXT UNIQUE NOT NULL,
    event_title TEXT,
    issue_date DATE,
    template_url TEXT NOT NULL,
    pos_x FLOAT DEFAULT 50,
    pos_y FLOAT DEFAULT 50,
    font_size INT DEFAULT 48,
    text_color VARCHAR(20) DEFAULT '#0A3225',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. تفعيل حماية حقل الصفوف (Row Level Security - RLS)
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

-- 3. سياسة السماح للعموم بالبحث والقراءة فقط
CREATE POLICY "Allow public read access" 
ON public.certificates 
FOR SELECT 
USING (true);

-- 4. سياسة حصر الإضافة والتعديل والحذف على المشرف المصرح له فقط
CREATE POLICY "Allow admin write access" 
ON public.certificates 
FOR ALL 
TO authenticated 
USING (auth.jwt() ->> 'email' = 'aleezalsapaei@gmail.com')
WITH CHECK (auth.jwt() ->> 'email' = 'aleezalsapaei@gmail.com');

-- 5. إنشاء مجلد التخزين العام للقوالب (Storage Bucket)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('templates', 'templates', true)
ON CONFLICT (id) DO NOTHING;

-- 6. سياسات الوصول لمجلد التخزين
CREATE POLICY "Public Template Access" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'templates');

CREATE POLICY "Admin Template Upload Access" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'templates' AND auth.jwt() ->> 'email' = 'aleezalsapaei@gmail.com');
