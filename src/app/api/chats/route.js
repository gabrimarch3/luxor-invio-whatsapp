// app/api/chats/route.js

import pool from '@/lib/db';

export async function GET(request) {
  try {
    const [rows] = await pool.query(`
      SELECT mobile AS id, name, MAX(created_at) AS lastTime, message AS lastMessage
      FROM spottywa_risposte
      GROUP BY mobile
      ORDER BY lastTime DESC
    `);

    const chats = rows.map(row => ({
      id: row.id,
      name: row.name || row.id,
      lastMessage: extractMessageText(row.lastMessage),
      time: formatTime(row.lastTime),
      avatar: null,
      unreadCount: 0,
    }));

    return new Response(JSON.stringify(chats), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Errore nel recupero delle chat:', error);
    return new Response(JSON.stringify({ message: 'Errore nel recupero delle chat' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

const extractMessageText = (messageJSON) => {
  try {
    const messageArray = JSON.parse(messageJSON);
    const messageData = messageArray[0];
    return messageData.text ? messageData.text.body : '';
  } catch (error) {
    console.error('Errore nel parsing del messaggio:', error);
    return '';
  }
};

const formatTime = (date) => {
  const d = new Date(date);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};
