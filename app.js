document.addEventListener('DOMContentLoaded', () => {

    // =================================================================
    // BÖLÜM 1: PWA KURULUM MANTIĞI
    // =================================================================

    let deferredPrompt;
    const installButton = document.getElementById('install-pwa-btn');

    // Cihazın iOS (iPhone/iPad) olup olmadığını kontrol eden yardımcı fonksiyon
    function isIOS() {
        return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    }

    // Uygulama henüz bir PWA olarak kurulmamışsa ve cihaz iOS ise,
    // kullanıcıya manuel kurulum talimatlarını göster.
    if (installButton && !window.matchMedia('(display-mode: standalone)').matches && isIOS()) {
        installButton.innerHTML = '📲 Kurmak için: Paylaş > Ana Ekrana Ekle';
        installButton.classList.remove('hidden');
        installButton.addEventListener('click', (e) => {
            e.preventDefault();
            alert('Lütfen tarayıcınızın altındaki "Paylaş" ikonuna dokunun ve açılan menüden "Ana Ekrana Ekle" seçeneğini seçin.');
        });
    }

    // `beforeinstallprompt` olayı, tarayıcı tarafından PWA kurulumu destekleniyorsa tetiklenir.
    window.addEventListener('beforeinstallprompt', (e) => {
        // Tarayıcının kendi kurulum istemini göstermesini engelle
        e.preventDefault();
        // Olayı daha sonra kullanmak üzere sakla
        deferredPrompt = e;
        // Kendi "Uygulamayı Yükle" butonumuzu göster (eğer HTML'de varsa)
        if (installButton) {
            installButton.classList.remove('hidden');
        }
    });

    // Kullanıcı kendi "Uygulamayı Yükle" butonumuza tıkladığında...
    // Butonun HTML'de var olduğundan emin olarak olay dinleyicisi ekle
    if (installButton) {
        installButton.addEventListener('click', async () => {
            // Sadece saklanmış bir istem varsa devam et
            if (deferredPrompt) {
                // Kurulum istemini göster
                deferredPrompt.prompt();
                // Kullanıcının seçimini bekle
                const { outcome } = await deferredPrompt.userChoice;
                // Değişkeni temizle, çünkü istem sadece bir kez kullanılabilir
                deferredPrompt = null;
                // İstem gösterildikten sonra butonu tekrar gizle
                installButton.classList.add('hidden');
            }
        });
    }

    // Uygulama başarıyla yüklendiğinde tetiklenir
    window.addEventListener('appinstalled', () => {
        // Değişkeni temizle ve butonu gizle
        deferredPrompt = null;
        if (installButton) {
            installButton.classList.add('hidden');
        }
    });


    // =================================================================
    // BÖLÜM 2: FATURA HESAPLAMA MANTIĞI
    // =================================================================

    const form = document.getElementById('calculator-form');
    const prevReadingInput = document.getElementById('prevReading');
    const currentReadingInput = document.getElementById('currentReading');
    const dayCountInput = document.getElementById('dayCount');
    const resultContainer = document.getElementById('result-container');
    const totalAmountElement = document.getElementById('total-amount');
    const whatIfAmountElement = document.getElementById('aksa-what-if-amount');
    const extraCostElement = document.getElementById('aksa-extra-cost');

    // SABİT DEĞERLER (KIB-TEK Tarifesinden)
    const TARIFF_SLICES = [
        { range_kwh: '0-250', capacity_kwh_30_days: 250, unit_price_tl_kwh: 4.8044 },
        { range_kwh: '251-500', capacity_kwh_30_days: 250, unit_price_tl_kwh: 9.9115 },
        { range_kwh: '501-750', capacity_kwh_30_days: 250, unit_price_tl_kwh: 10.6573 },
        { range_kwh: '751-1000', capacity_kwh_30_days: 250, unit_price_tl_kwh: 11.5519 },
        { range_kwh: '1001+', capacity_kwh_30_days: Infinity, unit_price_tl_kwh: 13.8069 }
    ];
    const FIXED_CHARGE_30_DAYS = 79.29;      // Maktu Ücret (30 günlük)
    const STREET_LIGHTING_30_DAYS = 77.03;   // Sokak Aydınlatma (30 günlük)
    const VAT_RATE = 0.10;                   // KDV Oranı (%10)
    const AKSA_COST_DIFFERENCE_RATIO = 0.28; // AKSA kaynaklı maliyet farkı oranı (%28)

    // Form elementinin HTML'de var olduğundan emin olarak olay dinleyicisi ekle
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault(); // Formun sayfayı yenilemesini engelle

            const prevReading = parseFloat(prevReadingInput.value);
            const currentReading = parseFloat(currentReadingInput.value);
            const dayCount = parseInt(dayCountInput.value) || 30;

            if (isNaN(prevReading) || isNaN(currentReading) || currentReading < prevReading) {
                alert("Lütfen geçerli sayaç değerleri giriniz. Şu anki değer, son okuma değerinden küçük olamaz.");
                return;
            }

            const usedKwh = currentReading - prevReading;
            const prorationFactor = dayCount / 30.0;

            let netConsumptionCost = 0;
            let remainingKwh = usedKwh;

            for (const slice of TARIFF_SLICES) {
                if (remainingKwh <= 0) break;
                const adjustedCapacity = slice.capacity_kwh_30_days === Infinity ? Infinity : slice.capacity_kwh_30_days * prorationFactor;
                const kwhInThisSlice = Math.min(remainingKwh, adjustedCapacity);
                netConsumptionCost += kwhInThisSlice * slice.unit_price_tl_kwh;
                remainingKwh -= kwhInThisSlice;
            }

            const adjustedFixedCharge = FIXED_CHARGE_30_DAYS * prorationFactor;
            const adjustedStreetLighting = STREET_LIGHTING_30_DAYS * prorationFactor;
            const subTotal = netConsumptionCost + adjustedFixedCharge + adjustedStreetLighting;
            const vatAmount = subTotal * VAT_RATE;
            const totalAmount = subTotal + vatAmount;
            const whatIfAmount = totalAmount * (1 - AKSA_COST_DIFFERENCE_RATIO);
            const extraCost = totalAmount - whatIfAmount;

            totalAmountElement.textContent = `${totalAmount.toFixed(2)} TL`;
            whatIfAmountElement.textContent = `${whatIfAmount.toFixed(2)} TL`;
            extraCostElement.textContent = `${extraCost.toFixed(2)} TL`;
            
            resultContainer.classList.remove('hidden');
            resultContainer.scrollIntoView({ behavior: 'smooth' });
        });
    }
});