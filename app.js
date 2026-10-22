// Application State & Storage
let activeCertificateData = null; // Stores currently viewed certificate for rendering/downloading
let uploadedTemplateImage = null; // Admin template HTML Image Element

// Toggle Modal Helper
function toggleModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.toggle('hidden');
    }
}

// 1. Search Functionality
async function handleSearch(e) {
    e.preventDefault();
    const query = document.getElementById('searchInput').value.trim();
    const resultsContainer = document.getElementById('resultsContainer');
    const submitBtn = document.getElementById('searchSubmitBtn');

    if (!query) return;

    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> جاري البحث...`;

    try {
        // Query Supabase certificates table
        const { data, error } = await supabaseClient
            .from('certificates')
            .select('*')
            .or(`recipient_name.ilike.%${query}%,cert_number.eq.${query}`);

        if (error) throw error;

        resultsContainer.classList.remove('hidden');
        resultsContainer.innerHTML = '';

        if (!data || data.length === 0) {
            resultsContainer.innerHTML = `
                <div class="bg-amber-50 border-r-4 border-amber-500 p-6 rounded-xl text-amber-800 text-center shadow">
                    <i class="fa-solid fa-triangle-exclamation text-3xl mb-2"></i>
                    <p class="font-bold text-lg">لم يتم العثور على أي شهادة مسجلة بهذا الاسم أو الرقم.</p>
                    <p class="text-sm">يرجى التأكد من كتابة الاسم بدقة كما هو مدون في الشهادة الرسمية.</p>
                </div>
            `;
        } else {
            data.forEach(cert => {
                const certCard = document.createElement('div');
                certCard.className = "bg-white p-6 rounded-xl shadow-md border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4 transition hover:shadow-lg";
                certCard.innerHTML = `
                    <div class="space-y-1 text-center md:text-right">
                        <span class="inline-block bg-brand-primary/10 text-brand-primary text-xs font-bold px-3 py-1 rounded-full mb-1">شهادة موثقة ورسمية</span>
                        <h4 class="text-xl font-bold text-brand-dark">${cert.recipient_name}</h4>
                        <p class="text-sm text-gray-600"><span class="font-bold">الفعالية:</span> ${cert.event_title || 'منتدى السلام والسلم الدولي'}</p>
                        <p class="text-xs text-gray-500"><span class="font-bold">رقم الشهادة:</span> ${cert.cert_number} | <span class="font-bold">تاريخ الإصدار:</span> ${cert.issue_date || '2026'}</p>
                    </div>
                    <div>
                        <button onclick='openCertificatePreview(${JSON.stringify(cert)})' class="bg-brand-primary hover:bg-brand-dark text-brand-gold px-6 py-3 rounded-xl font-bold shadow transition flex items-center gap-2 text-sm">
                            <i class="fa-solid fa-eye"></i> معاينة واستخراج الشهادة
                        </button>
                    </div>
                `;
                resultsContainer.appendChild(certCard);
            });
        }
    } catch (err) {
        alert("حدث خطأ أثناء البحث: " + err.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<i class="fa-solid fa-magnifying-glass"></i> <span>بحث</span>`;
    }
}

// 2. Open Certificate Preview Modal & Render Image
function openCertificatePreview(cert) {
    activeCertificateData = cert;
    toggleModal('certPreviewModal');

    const canvas = document.getElementById('certCanvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.crossOrigin = "anonymous";
    img.src = cert.template_url;

    img.onload = () => {
        // Set Canvas dimensions to match high-resolution image
        canvas.width = img.width;
        canvas.height = img.height;

        // Draw original background template image
        ctx.drawImage(img, 0, 0, img.width, img.height);

        // Apply recipient text based on saved parameters
        const posX = (cert.pos_x / 100) * img.width;
        const posY = (cert.pos_y / 100) * img.height;
        const fontSize = cert.font_size || 48;
        const textColor = cert.text_color || '#0A3225';

        ctx.font = `bold ${fontSize}px Tajawal, sans-serif`;
        ctx.fillStyle = textColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Draw Name
        ctx.fillText(cert.recipient_name, posX, posY);
    };
}

function closePreviewModal() {
    toggleModal('certPreviewModal');
    activeCertificateData = null;
}

// 3. Download Real PDF to User Device
function downloadCertificatePDF() {
    if (!activeCertificateData) return;

    const canvas = document.getElementById('certCanvas');
    const imgData = canvas.toDataURL('image/jpeg', 1.0);

    // Initialize jsPDF in correct orientation (Landscape or Portrait) based on dimensions
    const isLandscape = canvas.width >= canvas.height;
    const { jsPDF } = window.jspdf;
    
    const pdf = new jsPDF({
        orientation: isLandscape ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
    });

    pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height);
    
    // Download directly to device
    const fileName = `شهادة_${activeCertificateData.recipient_name}_${activeCertificateData.cert_number}.pdf`;
    pdf.save(fileName);
}

// 4. Direct Printing Support
function printCertificate() {
    const canvas = document.getElementById('certCanvas');
    const dataUrl = canvas.toDataURL();

    const windowContent = `
        <!DOCTYPE html>
        <html dir="rtl">
        <head><title>طباعة الشهادة</title></head>
        <body style="margin:0; flex justify-content:center; align-items:center; display:flex; min-height:100vh; background:#fff;">
            <img src="${dataUrl}" style="max-width:100%; max-height:100vh; object-fit:contain;" onload="window.print(); window.close();"/>
        </body>
        </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(windowContent);
    printWindow.document.close();
}

// 5. Admin Authentication & Management Panel
async function handleAdminLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    const submitBtn = document.getElementById('loginSubmitBtn');

    submitBtn.disabled = true;
    submitBtn.innerText = "جاري المصادقة...";

    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) throw error;

        toggleModal('loginModal');
        document.getElementById('adminPanel').classList.remove('hidden');
        alert("تم تسجيل الدخول بنجاح بصفتك المشرف.");
    } catch (err) {
        alert("فشل تسجيل الدخول: " + err.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = "دخول";
    }
}

function logoutAdmin() {
    supabaseClient.auth.signOut();
    document.getElementById('adminPanel').classList.add('hidden');
}

// 6. Template Upload & Admin Canvas Update
function handleTemplateUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (event) {
        uploadedTemplateImage = new Image();
        uploadedTemplateImage.onload = function () {
            updateAdminCanvasPreview();
        };
        uploadedTemplateImage.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

function updateAdminCanvasPreview() {
    if (!uploadedTemplateImage) return;

    const canvas = document.getElementById('adminCanvas');
    const ctx = canvas.getContext('2d');

    canvas.width = uploadedTemplateImage.width;
    canvas.height = uploadedTemplateImage.height;

    ctx.drawImage(uploadedTemplateImage, 0, 0, canvas.width, canvas.height);

    const posX = (document.getElementById('posX').value / 100) * canvas.width;
    const posY = (document.getElementById('posY').value / 100) * canvas.height;
    const fontSize = document.getElementById('fontSize').value || 48;
    const textColor = document.getElementById('textColor').value || '#0A3225';

    ctx.font = `bold ${fontSize}px Tajawal, sans-serif`;
    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillText("اسم المستفيد الافتراضي معايَنة", posX, posY);
}

// 7. Publish Batch Certificates
async function publishCertificatesBatch() {
    const fileInput = document.getElementById('templateFileInput');
    const eventTitle = document.getElementById('eventTitleInput').value.trim();
    const eventDate = document.getElementById('eventDateInput').value;
    const namesRaw = document.getElementById('namesListInput').value.trim();
    const publishBtn = document.getElementById('publishBtn');

    if (!fileInput.files[0]) {
        alert("يرجى اختيار صورة قالب الشهادة أولاً.");
        return;
    }

    if (!namesRaw) {
        alert("يرجى إدخال أسماء المستفيدين.");
        return;
    }

    const namesArray = namesRaw.split('\n').map(n => n.trim()).filter(n => n.length > 0);
    if (namesArray.length === 0) return;

    publishBtn.disabled = true;
    publishBtn.innerText = "جاري رفع القالب ونشر الشهادات...";

    try {
        const file = fileInput.files[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `template_${Date.now()}.${fileExt}`;

        // Upload Template to Supabase Storage Bucket
        const { data: storageData, error: storageError } = await supabaseClient.storage
            .from('templates')
            .upload(fileName, file);

        if (storageError) throw storageError;

        // Get Public URL
        const { data: urlData } = supabaseClient.storage
            .from('templates')
            .getPublicUrl(fileName);

        const templatePublicUrl = urlData.publicUrl;

        const posX = parseFloat(document.getElementById('posX').value);
        const posY = parseFloat(document.getElementById('posY').value);
        const fontSize = parseInt(document.getElementById('fontSize').value);
        const textColor = document.getElementById('textColor').value;

        // Prepare Batch Objects
        const certificateRecords = namesArray.map(name => {
            const randomCode = Math.floor(1000 + Math.random() * 9000);
            return {
                recipient_name: name,
                cert_number: `IPSF-${new Date().getFullYear()}-${randomCode}`,
                event_title: eventTitle || "فعالية منتدى السلام والسلم الدولي",
                issue_date: eventDate || new Date().toISOString().split('T')[0],
                template_url: templatePublicUrl,
                pos_x: posX,
                pos_y: posY,
                font_size: fontSize,
                text_color: textColor
            };
        });

        // Insert into Database
        const { error: insertError } = await supabaseClient
            .from('certificates')
            .insert(certificateRecords);

        if (insertError) throw insertError;

        alert(`تم بنجاح توليد ونشر ${certificateRecords.length} شهادة!`);
        document.getElementById('namesListInput').value = '';
    } catch (err) {
        alert("حدث خطأ أثناء العمليات: " + err.message);
    } finally {
        publishBtn.disabled = false;
        publishBtn.innerText = "توليد ونشر جميع الشهادات الآن";
    }
}
