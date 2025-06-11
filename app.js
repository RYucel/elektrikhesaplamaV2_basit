document.addEventListener('DOMContentLoaded', () => {
    // FORM ve SONUÇ ELEMENTLERİ
    const form = document.getElementById('calculator-form');
    const prevReadingInput = document.getElementById('prevReading');
    const currentReadingInput = document.getElementById('currentReading');
    const dayCountInput = document.getElementById('dayCount');
    const resultContainer = document.getElementById('result-container');
    const totalAmountElement = document.getElementById('total-amount');
    
    // AKSA karşılaştırma elementleri
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

    form.addEventListener('submit', (e) => {
        e.preventDefault(); // Formun sayfayı yenilemesini engelle

        // Girdi değerlerini al ve sayıya çevir
        const prevReading = parseFloat(prevReadingInput.value);
        const currentReading = parseFloat(currentReadingInput.value);
        const dayCount = parseInt(dayCountInput.value) || 30;

        // Girdi kontrolü
        if (isNaN(prevReading) || isNaN(currentReading) || currentReading < prevReading) {
            alert("Lütfen geçerli sayaç değerleri giriniz. Şu anki değer, son okuma değerinden küçük olamaz.");
            return;
        }

        const usedKwh = currentReading - prevReading;
        const prorationFactor = dayCount / 30.0; // Gün sayısına göre oranlama faktörü

        // 1. Net Tüketim Bedelini Hesapla
        let netConsumptionCost = 0;
        let remainingKwh = usedKwh;

        for (const slice of TARIFF_SLICES) {
            if (remainingKwh <= 0) break;

            const adjustedCapacity = slice.capacity_kwh_30_days === Infinity ? Infinity : slice.capacity_kwh_30_days * prorationFactor;
            const kwhInThisSlice = Math.min(remainingKwh, adjustedCapacity);
            
            netConsumptionCost += kwhInThisSlice * slice.unit_price_tl_kwh;
            remainingKwh -= kwhInThisSlice;
        }

        // 2. Diğer Ücretleri Hesapla (gün sayısına göre oranlayarak)
        const adjustedFixedCharge = FIXED_CHARGE_30_DAYS * prorationFactor;
        const adjustedStreetLighting = STREET_LIGHTING_30_DAYS * prorationFactor;

        // 3. Ara Toplamı Hesapla
        const subTotal = netConsumptionCost + adjustedFixedCharge + adjustedStreetLighting;

        // 4. KDV'yi Hesapla
        const vatAmount = subTotal * VAT_RATE;

        // 5. Genel Toplamı Hesapla
        const totalAmount = subTotal + vatAmount;

        // 6. AKSA Karşılaştırmasını Hesapla
        const whatIfAmount = totalAmount * (1 - AKSA_COST_DIFFERENCE_RATIO);
        const extraCost = totalAmount - whatIfAmount;

        // Sonuçları ekranda göster
        totalAmountElement.textContent = `${totalAmount.toFixed(2)} TL`;
        whatIfAmountElement.textContent = `${whatIfAmount.toFixed(2)} TL`;
        extraCostElement.textContent = `${extraCost.toFixed(2)} TL`;
        
        resultContainer.classList.remove('hidden');

        // Sonuca pürüzsüz kaydır
        resultContainer.scrollIntoView({ behavior: 'smooth' });
    });

    // YENİ EKLENECEK PWA KURULUM MANTIĞI
    let deferredPrompt;
    const installButton = document.getElementById('install-pwa-btn');

    window.addEventListener('beforeinstallprompt', (e) => {
        // Tarayıcının kendi kurulum istemini göstermesini engelle
        e.preventDefault();
        // `beforeinstallprompt` olayını daha sonra kullanmak üzere sakla
        deferredPrompt = e;
        // Kendi "Uygulamayı Yükle" butonumuzu göster
        installButton.classList.remove('hidden');
        console.log('`beforeinstallprompt` olayı yakalandı. Kurulum butonu gösteriliyor.');
    });

    installButton.addEventListener('click', async () => {
        if (deferredPrompt) {
            // Butonu gizle, çünkü istem bir kez gösterilebilir
            installButton.classList.add('hidden');
            
            // Kurulum istemini göster
            deferredPrompt.prompt();
            
            // Kullanıcının seçimini bekle
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`Kullanıcı kurulumu ${outcome} etti.`);
            
            // `deferredPrompt` değişkenini temizle, çünkü artık kullanılamaz
            deferredPrompt = null;
        }
    });

    window.addEventListener('appinstalled', () => {
        // Uygulama yüklendiğinde butonu tamamen gizle ve konsola bilgi yaz
        console.log('PWA başarıyla yüklendi!');
        installButton.classList.add('hidden');
        deferredPrompt = null;
    });
});