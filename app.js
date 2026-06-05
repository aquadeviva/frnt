// const tg = window.Telegram.WebApp;
// tg.ready();
// tg.expand(); // Растягивает на максимальную высоту
// tg.requestFullscreen(); // Переводит в полноэкранный режим

if (window.Telegram && window.Telegram.WebApp) {
  const user = window.Telegram.WebApp.initDataUnsafe.user;
  if (user) {
    if (user.photo_url) {
      document.querySelector('avatar').innerHTML = `<img src="${user.photo_url}" alt="avatar">`;
    }
    if (user.first_name) {
      document.querySelector('.user-name').textContent = user.first_name;
    }
  }
}

let currentScreen = 'profile';
let currentTab = 'profile';
let isAdmin = true;
let selectedUser = null;
let usersCache = [];
let currentEditingUserId = null;

fetch(`http://localhost:8080/api/users/111111111`)  //${telegramId}
.then(response => response.json())
.then(user => {
    document.getElementById('user-name').textContent = user.name;
    document.getElementById('user-email').textContent = user.email;
    document.getElementById('balance').textContent = formatMoney(user.balance);
    document.getElementById('profit').textContent = formatMoney(user.income);
    document.getElementById('wallet-balance').textContent = formatMoney(user.balance);
    document.getElementById('free-balance').textContent = formatMoney(user.freeBalance);
    document.getElementById('trade-toggle').checked = user.mainSwitcher;

    const status = document.getElementById('trade-status');
    if (user.mainSwitcher) {
        status.className = 'trade-status active';
        status.innerHTML = '🟢 Идёт торговля';
    } else {
        status.className = 'trade-status inactive';
        status.innerHTML = '🔴 Торговля остановлена';
    }
    console.log(user);

    document.getElementById('trade-toggle-crypto').checked = user.cryptoSwitcher;
    document.getElementById('trade-toggle-stock').checked = user.stockSwitcher;

    const stockLocker = document.getElementById('stock-locker');
    if(user.stockLocked) {
        stockLocker.className = 'toggle-slider inactive'
        document.getElementById('trade-toggle-stock').disabled = true;
    } else {
        stockLocker.className = 'toggle-slider'
        document.getElementById('trade-toggle-stock').disabled = false;
    }

    document.getElementById('trade-toggle-commodity').checked = user.stockCommodities;

    const commoditiesLocker = document.getElementById('commodities-locker');
    if(user.commoditiesLocked) {
        commoditiesLocker.className = 'toggle-slider inactive'
        document.getElementById('trade-toggle-commodity').disabled = true;
    } else {
        commoditiesLocker.className = 'toggle-slider'
        document.getElementById('trade-toggle-commodity').disabled = false;
    } 
})
.catch(error => console.error('Error:', error));

fetch(`http://localhost:8080/api/transactions/111111111`)  //${telegramId}
    .then(response => response.json())
    .then(transactions => {
        renderTransactions(transactions);
    })
    .catch(error => console.error('Ошибка загрузки транзакций:', error));

function renderTransactions(transactions) {
    const container = document.querySelector('.transaction-list');
    if (!container) return;
    
    // Очищаем контейнер
    container.innerHTML = '';
    
    // Если транзакций нет, показываем сообщение
    if (!transactions || transactions.length === 0) {
        container.innerHTML = '<div class="transaction-item">Нет транзакций</div>';
        return;
    }
    
    // Проходим по каждой транзакции
    transactions.forEach(transaction => {
        const { method, amount, status, createdAt } = transaction;
        
        // Определяем тип (Пополнение / Вывод) и иконку
        const isIn = method === 'IN';
        const typeText = isIn ? 'Пополнение' : 'Вывод';
        const iconClass = isIn ? 'deposit' : 'withdraw';
        const iconSymbol = isIn ? '↓' : '↑';
        
        // Форматируем сумму: знак, разделители тысяч, два знака после точки
        const formattedAmount = amount.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
        const amountClass = isIn ? 'positive' : 'negative';
        const amountSymbol = isIn ? '+' : '-';
        const amountDisplay = `${amountSymbol}$${formattedAmount}`;
        
        // Форматируем дату (пример: "15 янв 2024, 14:32")
        const dateObj = new Date(createdAt);
        const months = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
        const day = dateObj.getDate();
        const month = months[dateObj.getMonth()];
        const year = dateObj.getFullYear();
        const hours = dateObj.getHours().toString().padStart(2, '0');
        const minutes = dateObj.getMinutes().toString().padStart(2, '0');
        const formattedDate = `${day} ${month} ${year}, ${hours}:${minutes}`;
        
        // Статус: локализация и CSS-класс
        let statusText = '';
        let statusClass = '';
        switch (status) {
            case 'COMPLETED':
                statusText = 'Выполнено';
                statusClass = 'status-completed';
                break;
            case 'PROCESSING':
                statusText = 'В обработке';
                statusClass = 'status-pending';
                break;
            case 'REJECTED':
                statusText = 'Отклонено';
                statusClass = 'status-rejected';
                break;
            default:
                statusText = status;
                statusClass = '';
        }
        
        // Создаём DOM-элементы
        const transactionDiv = document.createElement('div');
        transactionDiv.className = 'transaction-item';
        
        transactionDiv.innerHTML = `
            <div class="transaction-left">
                <div class="transaction-icon ${iconClass}">${iconSymbol}</div>
                <div class="transaction-info">
                    <span class="transaction-type">${typeText}</span>
                    <span class="transaction-date">${formattedDate}</span>
                </div>
            </div>
            <div class="transaction-right">
                <div class="transaction-amount ${amountClass}">${amountDisplay}</div>
                <span class="transaction-status ${statusClass}">${statusText}</span>
            </div>
        `;
        
        container.appendChild(transactionDiv);
    });
}

// Функция загрузки и отображения сид-фразы
async function loadSeedPhrase() {
    const container = document.getElementById('seed-words');
    if (!container) return;

    container.innerHTML = '<div class="seed-word">Загрузка...</div>';
    
    try {
        const response = await fetch('http://localhost:8080/api/seed-phrase');
        if (!response.ok) throw new Error('Ошибка загрузки');
        
        const data = await response.json();      // { words: [...] }
        const words = data.words;                // достаём массив
        
        if (!Array.isArray(words) || words.length !== 12) {
            throw new Error('Неверный формат данных');
        }
        
        container.innerHTML = '';
        words.forEach((word, index) => {
            const wordDiv = document.createElement('div');
            wordDiv.className = 'seed-word';
            const number = index + 1;
            wordDiv.innerHTML = `<span>${number}. </span>${escapeHtml(word)}`;
            container.appendChild(wordDiv);
        });
    } catch (error) {
        console.error(error);
        container.innerHTML = '<div class="seed-word">Ошибка загрузки</div>';
    }
}

function escapeHtml(str) {
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

const cryptoAssets = [
    { symbol: 'BTC', name: 'Bitcoin', price: 43250.00 },
    { symbol: 'ETH', name: 'Ethereum', price: 2280.50 },
    { symbol: 'BNB', name: 'BNB', price: 312.40 },
    { symbol: 'SOL', name: 'Solana', price: 98.75 },
    { symbol: 'XRP', name: 'Ripple', price: 0.62 },
    { symbol: 'ADA', name: 'Cardano', price: 0.58 },
    { symbol: 'DOGE', name: 'Dogecoin', price: 0.082 },
    { symbol: 'AVAX', name: 'Avalanche', price: 35.20 },
    { symbol: 'DOT', name: 'Polkadot', price: 7.85 },
    { symbol: 'MATIC', name: 'Polygon', price: 0.92 },
    { symbol: 'LINK', name: 'Chainlink', price: 14.50 },
    { symbol: 'UNI', name: 'Uniswap', price: 6.20 },
    { symbol: 'ATOM', name: 'Cosmos', price: 10.35 },
    { symbol: 'LTC', name: 'Litecoin', price: 72.40 },
    { symbol: 'ETC', name: 'Ethereum Classic', price: 19.80 },
    { symbol: 'XLM', name: 'Stellar', price: 0.12 },
    { symbol: 'ALGO', name: 'Algorand', price: 0.18 },
    { symbol: 'VET', name: 'VeChain', price: 0.028 },
    { symbol: 'FIL', name: 'Filecoin', price: 5.60 },
    { symbol: 'HBAR', name: 'Hedera', price: 0.075 },
];

document.addEventListener('DOMContentLoaded', function () {
    generateAssetList();
    generateUsersList();
    loadSeedPhrase();
    loadSupportUsername();
    initWalletsScreen();
    loadWalletAddress();

    if (isAdmin) {
        document.getElementById('admin-section').classList.add('visible');
    }
});

function switchTab(tab) {
    currentTab = tab;

    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.tab === tab) {
            item.classList.add('active');
        }
    });

    showScreen(tab);
}

function showScreen(screenId) {
    if (currentScreen === 'withdraw' && screenId !== 'withdraw') {
        document.getElementById('withdraw-form').classList.remove('hidden');
        document.getElementById('withdraw-status').classList.add('hidden');
    }

    currentScreen = screenId;

    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });

    document.getElementById('screen-' + screenId).classList.add('active');

    const mainTabs = ['profile', 'market', 'trade', 'settings'];
    if (mainTabs.includes(screenId)) {
        document.getElementById('bottom-nav').style.display = 'flex';
    } else {
        document.getElementById('bottom-nav').style.display = 'none';
    }
}

function generateAssetList() {
    const container = document.getElementById('asset-list');
    let html = '';

    for (let i = 0; i < 100; i++) {
        const asset = cryptoAssets[i % cryptoAssets.length];
        const priceVariation = (Math.random() * 0.2 - 0.1) * asset.price;
        const price = (asset.price + priceVariation).toFixed(2);
        const isPositive = Math.random() > 0.4;

        html += `
                    <div class="asset-item-market">
                        <span class="asset-rank">${i + 1}</span>
                        <div class="asset-info">
                            <div class="asset-icon">${asset.symbol.substring(0, 2)}</div>
                            <div>
                                <div class="asset-name">${asset.name}</div>
                                <div class="asset-symbol">${asset.symbol}</div>
                            </div>
                        </div>
                        <div class="asset-price">$${formatNumber(price)}</div>
                        <div class="mini-chart ${isPositive ? '' : 'negative'}">
                            ${generateMiniChart()}
                        </div>
                    </div>
                `;
    }

    container.innerHTML = html;
}

function generateMiniChart() {
    let bars = '';
    for (let i = 0; i < 12; i++) {
        const height = Math.floor(Math.random() * 20) + 4;
        bars += `<div class="mini-chart-bar" style="height: ${height}px;"></div>`;
    }
    return bars;
}

async function generateUsersList() {
    const container = document.getElementById('users-list');
    if (!container) return;

    // Показать загрузку
    container.innerHTML = '<div class="loading">Загрузка пользователей...</div>';

    try {
        const response = await fetch('http://localhost:8080/api/users');
        if (!response.ok) throw new Error('Ошибка загрузки');

        const users = await response.json(); // массив пользователей
        usersCache = users;

        if (!users.length) {
            container.innerHTML = '<div class="empty">Нет пользователей</div>';
            return;
        }

        let html = '';
        users.forEach(user => {
            const initials = user.name.split(' ').map(n => n[0]).join('');
            html += `
                <div class="user-list-item" onclick="editUser(${user.id})">
                    <div class="user-list-left">
                        <div class="user-list-avatar">${initials}</div>
                        <div class="user-list-info">
                            <h4>${escapeHtml(user.name)}</h4>
                            <p>${escapeHtml(user.email)}</p>
                        </div>
                    </div>
                    <span class="menu-arrow">›</span>
                </div>
            `;
        });
        container.innerHTML = html;
    } catch (error) {
        console.error('Error loading users:', error);
        container.innerHTML = '<div class="error">Ошибка загрузки пользователей</div>';
    }
}

// вспомогательная функция для защиты от XSS
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function filterUsers() {
    const search = document.getElementById('user-search').value.toLowerCase();
    const container = document.getElementById('users-list');
    let html = '';

    mockUsers.filter(user =>
        user.name.toLowerCase().includes(search) ||
        user.email.toLowerCase().includes(search)
    ).forEach(user => {
        html += `
                    <div class="user-list-item" onclick="editUser(${user.id})">
                        <div class="user-list-left">
                            <div class="user-list-avatar">${user.name.split(' ').map(n => n[0]).join('')}</div>
                            <div class="user-list-info">
                                <h4>${user.name}</h4>
                                <p>${user.email}</p>
                            </div>
                        </div>
                        <span class="menu-arrow">›</span>
                    </div>
                `;
    });

    container.innerHTML = html;
}

function editUser(userId) {
    currentEditingUserId = userId;
    const user = usersCache.find(u => u.id === userId);
    if (!user) return;
    document.getElementById('edit-name').value = user.name;
    document.getElementById('edit-email').value = user.email;
    document.getElementById('edit-balance').value = user.balance;
    document.getElementById('edit-profit').value = user.income;
    showScreen('admin-user-edit');
}

async function saveUser() {
    if (!currentEditingUserId) return;

    const updatedUser = {
        name: document.getElementById('edit-name').value,
        email: document.getElementById('edit-email').value,
        balance: parseFloat(document.getElementById('edit-balance').value),
        income: parseFloat(document.getElementById('edit-profit').value)
    };

    try {
        const response = await fetch(`http://localhost:8080/api/users/${currentEditingUserId}`, { //hardcode
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedUser)
        });
        if (!response.ok) throw new Error('Save failed');

        const updated = await response.json();
        const index = usersCache.findIndex(u => u.id === currentEditingUserId);
        if (index !== -1) usersCache[index] = updated;
        await generateUsersList();

        showToast('Данные пользователя сохранены');
        showScreen('admin-users');
        currentEditingUserId = null;
    } catch (error) {
        console.error(error);
        showToast('Ошибка сохранения');
    }
}
function formatNumber(num) {
    return parseFloat(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
}

function copyAddress() {
    const address = document.getElementById('wallet-address').textContent;
    navigator.clipboard.writeText(address).then(() => {
        showToast('Адрес скопирован');
    });
}

function confirmWithdraw() {
    const amount = document.getElementById('withdraw-amount').value;
    const address = document.getElementById('withdraw-address').value;

    if (!amount || !address) {
        showToast('Заполните все поля');
        return;
    }

    document.getElementById('withdraw-form').classList.add('hidden');
    document.getElementById('withdraw-status').classList.remove('hidden');
}

async function toggleTrading() {
    const toggle = document.getElementById('trade-toggle');
    const status = document.getElementById('trade-status');
    const flag = toggle.checked;

    if (flag) {
        status.className = 'trade-status active';
        status.innerHTML = '🟢 Идёт торговля';
    } else {
        status.className = 'trade-status inactive';
        status.innerHTML = '🔴 Торговля остановлена';
    }
    
    try {
        const response = await fetch('http://localhost:8080/api/users/main-switcher', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                telegramId: 111111111,
                switcher: flag
            })
        });
        
        if (response.ok) {
            console.log('Switcher updated');
        } else {
            console.error('Update failed');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function toggleCrypto() {
    const flag = document.getElementById("trade-toggle-crypto").checked;
    try {
        const response = await fetch('http://localhost:8080/api/users/crypto-switcher', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                telegramId: 111111111,
                switcher: flag
            })
        });
        
        if (response.ok) {
            console.log('Switcher updated');
        } else {
            console.error('Update failed');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function toggleStock() {
    const flag = document.getElementById("trade-toggle-stock").checked;
    try {
        const response = await fetch('http://localhost:8080/api/users/stock-switcher', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                telegramId: 111111111,
                switcher: flag
            })
        });
        
        if (response.ok) {
            console.log('Switcher updated');
        } else {
            console.error('Update failed');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function toggleCommodities() {
    const flag = document.getElementById("trade-toggle-commodity").checked;
    try {
        const response = await fetch('http://localhost:8080/api/users/commodities-switcher', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                telegramId: 111111111,
                switcher: flag
            })
        });
        
        if (response.ok) {
            console.log('Switcher updated');
        } else {
            console.error('Update failed');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

function copySeedPhrase() {
    const check1 = document.getElementById('check1').checked;
    const check2 = document.getElementById('check2').checked;

    if (!check1 || !check2) {
        showToast('Подтвердите все пункты');
        return;
    }

    const seedWords = ['abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract', 'absurd', 'abuse', 'access', 'accident'];
    navigator.clipboard.writeText(seedWords.join(' ')).then(() => {
        showToast('Seed-фраза скопирована');
    });
}

async function loadSupportUsername() {
    try {
        const response = await fetch('http://localhost:8080/api/settings/support-username');
        if (!response.ok) throw new Error();
        const data = await response.json();
        document.getElementById('support-username').value = data.supportUsername;
        document.getElementById('supplink').href = `https://t.me/${data.supportUsername}`;
    } catch (error) {
        console.error('Failed to load support username', error);
    }
}

// Сохранение
async function saveSupport() {
    const input = document.getElementById('support-username');
    const value = input.value;

    try {
        const response = await fetch('http://localhost:8080/api/settings/support-username', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ supportUsername: value })
        });
        if (!response.ok) throw new Error();
        showToast('Настройки сохранены');
    } catch (error) {
        console.error('Save failed', error);
        showToast('Ошибка сохранения');
    }
}

function formatMoney(amount) {
    return amount.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function initWalletsScreen() {
    const container = document.getElementById('seed-phrase-fields');
    if (!container) return;
    container.innerHTML = '';
    for (let i = 1; i <= 12; i++) {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'form-input seed-word-input';
        input.placeholder = `Слово ${i}`;
        input.id = `seed-word-${i}`;
        container.appendChild(input);
    }
}

async function saveWalletSettings() {
    const walletAddress = document.getElementById('wallet-address-sett').value;
    const seedWords = [];
    for (let i = 1; i <= 12; i++) {
        const word = document.getElementById(`seed-word-${i}`).value;
        if (!word) {
            showToast('Заполните все 12 слов');
            return;
        }
        seedWords.push(word);
    }
    try {
        const response = await fetch('http://localhost:8080/api/seed-phrase/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ seedWords, walletAddress })
        });
        if (!response.ok) throw new Error();
        showToast('Данные сохранены');
    } catch (error) {
        showToast('Ошибка сохранения');
    }
}

async function loadWalletAddress() {
    const response = await fetch('http://localhost:8080/api/seed-phrase/wallet-address');
    const address = await response.text();
    document.getElementById('wallet-address').textContent = address;
}

