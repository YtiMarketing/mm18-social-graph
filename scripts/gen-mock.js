import { buildGraphData } from './link-generator.js';
import { writeFileSync } from 'node:fs';

const profiles = [
  { user_id: '1', tg_username: 'ivanov_biz', first_name: 'Иван', last_name: 'Иванов', role: 'participant', city: 'Москва', role_text: 'фаундер B2B SaaS', tags: ['AI', 'B2B', 'SaaS', 'продажи'], request: ['клиент', 'инвестор'], offer: ['обмен опытом'], bio: 'Делаю SaaS для логистики, выручка 30М/год.' },
  { user_id: '2', tg_username: 'petrov_ai', first_name: 'Пётр', last_name: 'Петров', role: 'participant', city: 'Москва', role_text: 'AI-консультант', tags: ['AI', 'консалтинг', 'образование'], request: ['обмен опытом'], offer: ['ментор', 'советник'], bio: 'Учу команды работать с LLM.' },
  { user_id: '3', tg_username: 'sidorova_ecom', first_name: 'Анна', last_name: 'Сидорова', role: 'participant', city: 'СПб', role_text: 'основатель e-com бренда', tags: ['e-com', 'B2C', 'ритейл', 'медийка'], request: ['ментор', 'партнёр'], offer: ['клиент'], bio: 'Бренд одежды, 100М/год.' },
  { user_id: '4', tg_username: 'kuznetsov_dev', first_name: 'Дмитрий', last_name: 'Кузнецов', role: 'participant', city: 'Москва', role_text: 'CTO стартапа', tags: ['IT', 'разработка', 'B2B', 'SaaS'], request: ['сотрудник'], offer: ['обмен опытом'], bio: 'CTO в HRtech.' },
  { user_id: '5', tg_username: 'fedorova_hr', first_name: 'Елена', last_name: 'Фёдорова', role: 'participant', city: 'СПб', role_text: 'HRD', tags: ['HR', 'найм', 'B2B'], request: ['обмен опытом'], offer: ['сотрудник'], bio: 'HR-консалтинг.' },
  { user_id: '6', tg_username: 'volkov_invest', first_name: 'Алексей', last_name: 'Волков', role: 'participant', city: 'Москва', role_text: 'инвестор', tags: ['инвест', 'fintech', 'B2B'], request: ['обмен опытом'], offer: ['инвестор'], bio: 'Pre-seed/seed, ticket 10-50М.' },
  { user_id: '7', tg_username: 'pavlova_med', first_name: 'Ольга', last_name: 'Павлова', role: 'participant', city: 'Казань', role_text: 'медийщик', tags: ['маркетинг', 'PR', 'B2C', 'продажи'], request: ['клиент'], offer: ['обмен опытом'], bio: 'Personal brand.' },
  { user_id: '8', tg_username: 'morozov_prod', first_name: 'Сергей', last_name: 'Морозов', role: 'participant', city: 'Москва', role_text: 'фаундер производства', tags: ['производство', 'B2B', 'найм'], request: ['ментор', 'сотрудник'], offer: ['обмен опытом'], bio: 'Цех металлоконструкций.' },
  { user_id: '9', tg_username: 'shamalov', first_name: 'Артур', last_name: 'Шамалов', role: 'organizer', city: 'Москва', role_text: 'организатор MM', tags: ['предпринимательство', 'образование'], request: [], offer: ['ментор', 'обмен опытом'], bio: 'Орг потока MM18.' },
  { user_id: '10', tg_username: 'dolgov', first_name: 'Иван', last_name: 'Долгов', role: 'mentor', city: 'Москва', role_text: 'ментор', tags: ['продажи', 'B2B', 'предпринимательство'], request: [], offer: ['ментор'], bio: 'Эксперт по B2B-продажам.' },
  { user_id: '11', tg_username: 'katya_org', first_name: 'Катя', last_name: 'Со-орг', role: 'care', city: 'Москва', role_text: 'co-organizer', tags: [], request: [], offer: [], bio: '' },
  { user_id: '12', tg_username: 'tech_admin', first_name: 'Tech', last_name: 'Admin', role: 'tech', city: '', role_text: '', tags: [], request: [], offer: [], bio: '' },
];

const data = buildGraphData(profiles);
writeFileSync('./data/participants.json', JSON.stringify(data, null, 2), 'utf8');
console.log(`Generated ${data.nodes.length} nodes, ${data.links.length} links`);
