import { db } from '../db';
import { redis } from '../config/redis';

interface UserPreferences {
  language: string;
  tone: 'formal' | 'friendly' | 'professional';
  includeDetails: boolean;
  maxLength: number;
}

interface ContactQueueItem {
  listingId: number;
  userId: string;
  message: string;
  status: 'queued' | 'sent' | 'failed';
  createdAt: string;
}

export async function draftContactMessage(
  listing: {
    title: string;
    description: string | null;
    price: string;
    currency: string;
    city: string;
    bedrooms: number | null;
    surfaceArea: number | null;
  },
  userPreferences: UserPreferences = {
    language: 'en',
    tone: 'professional',
    includeDetails: true,
    maxLength: 500,
  }
): Promise<{ message: string; metadata: { tokens: number; model: string } }> {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    const fallbackMessage = generateFallbackMessage(listing, userPreferences);
    return {
      message: fallbackMessage,
      metadata: { tokens: 0, model: 'fallback' },
    };
  }

  try {
    const prompt = buildPrompt(listing, userPreferences);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are a helpful assistant that drafts concise, polite rental inquiry messages.',
          },
          { role: 'user', content: prompt },
        ],
        max_tokens: Math.min(userPreferences.maxLength, 800),
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`OpenAI API error: ${response.status} ${errorText}`);
      const fallbackMessage = generateFallbackMessage(listing, userPreferences);
      return {
        message: fallbackMessage,
        metadata: { tokens: 0, model: 'fallback' },
      };
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message?.content?.trim() || '';

    return {
      message,
      metadata: {
        tokens: data.usage?.total_tokens || 0,
        model: data.model || 'gpt-4o-mini',
      },
    };
  } catch (err) {
    console.error('AI draftContactMessage failed:', err);
    const fallbackMessage = generateFallbackMessage(listing, userPreferences);
    return {
      message: fallbackMessage,
      metadata: { tokens: 0, model: 'fallback' },
    };
  }
}

function buildPrompt(
  listing: {
    title: string;
    description: string | null;
    price: string;
    currency: string;
    city: string;
    bedrooms: number | null;
    surfaceArea: number | null;
  },
  prefs: UserPreferences
): string {
  const toneInstructions = {
    formal: 'Use a formal, respectful tone.',
    friendly: 'Use a warm, friendly tone.',
    professional: 'Use a professional but approachable tone.',
  };

  const langInstructions: Record<string, string> = {
    en: 'Write in English.',
    es: 'Write in Spanish.',
    fr: 'Write in French.',
    de: 'Write in German.',
    it: 'Write in Italian.',
    pt: 'Write in Portuguese.',
  };

  const details = prefs.includeDetails
    ? `The property is a ${listing.title} in ${listing.city}, priced at ${listing.price} ${listing.currency}.${listing.bedrooms ? ` It has ${listing.bedrooms} bedrooms.` : ''}${listing.surfaceArea ? ` The surface area is ${listing.surfaceArea} m².` : ''}`
    : '';

  return `Draft a rental inquiry message for the following property. ${toneInstructions[prefs.tone]} ${langInstructions[prefs.language] || 'Write in English.'}

Property: ${listing.title}
City: ${listing.city}
Price: ${listing.price} ${listing.currency}
${listing.description ? `Description: ${listing.description.slice(0, 300)}` : ''}
${details}

Keep the message concise (under ${prefs.maxLength} characters), polite, and include a brief introduction, expression of interest, and a few relevant questions about availability and viewing.`;
}

function generateFallbackMessage(
  listing: {
    title: string;
    price: string;
    currency: string;
    city: string;
    bedrooms: number | null;
    surfaceArea: number | null;
  },
  prefs: UserPreferences
): string {
  const greetings: Record<string, string> = {
    en: 'Hello,',
    es: 'Hola,',
    fr: "Bonjour,",
    de: 'Guten Tag,',
    it: 'Buongiorno,',
    pt: 'Olá,',
  };

  const bodies: Record<string, string> = {
    en: `I am interested in your property "${listing.title}" listed at ${listing.price} ${listing.currency} in ${listing.city}. Could you please let me know if it is still available and when a viewing would be possible?`,
    es: `Me interesa su propiedad "${listing.title}" listada en ${listing.price} ${listing.currency} en ${listing.city}. ¿Podría informarme si todavía está disponible y cuándo sería posible una visita?`,
    fr: `Je suis intéressé par votre propriété "${listing.title}" listée à ${listing.price} ${listing.currency} à ${listing.city}. Pourriez-vous me dire si elle est toujours disponible et quand une visite serait possible?`,
    de: `Ich interessiere mich für Ihre Immobilie "${listing.title}" mit einem Preis von ${listing.price} ${listing.currency} in ${listing.city}. Könnten Sie mir mitteilen, ob sie noch verfügbar ist und wann eine Besichtigung möglich wäre?`,
    it: `Sono interessato alla proprietà "${listing.title}" listata a ${listing.price} ${listing.currency} a ${listing.city}. Potrebbe dirmi se è ancora disponibile e quando sarebbe possibile una visita?`,
    pt: `Estou interessado na propriedade "${listing.title}" listada a ${listing.price} ${listing.currency} em ${listing.city}. Poderia informar-me se ainda está disponível e quando seria possível uma visita?`,
  };

  const closings: Record<string, string> = {
    en: 'Thank you and best regards,',
    es: 'Gracias y un saludo,',
    fr: 'Merci et cordialement,',
    de: 'Vielen Dank und freundliche Grüße,',
    it: 'Grazie e cordiali saluti,',
    pt: 'Obrigado e cumprimentos,',
  };

  const lang = prefs.language;
  return `${greetings[lang] || greetings.en}\n\n${bodies[lang] || bodies.en}\n\n${closings[lang] || closings.en}`;
}

export async function queueContact(
  listingId: number,
  userId: string,
  message: string
): Promise<ContactQueueItem> {
  const item: ContactQueueItem = {
    listingId,
    userId,
    message,
    status: 'queued',
    createdAt: new Date().toISOString(),
  };

  const queueKey = `contact_queue:${userId}`;
  const existing = JSON.parse((await redis.get(queueKey)) || '[]');
  existing.push(item);
  await redis.set(queueKey, JSON.stringify(existing));

  return item;
}

export async function getContactStatus(userId: string): Promise<ContactQueueItem[]> {
  const queueKey = `contact_queue:${userId}`;
  const data = await redis.get(queueKey);
  return data ? JSON.parse(data) : [];
}

export async function getContactStatusForListing(
  userId: string,
  listingId: number
): Promise<ContactQueueItem | null> {
  const items = await getContactStatus(userId);
  return items.find((i) => i.listingId === listingId) || null;
}
