const STORAGE_KEY = 'con-language';
export let language = 'en';
try {
  if (localStorage.getItem(STORAGE_KEY) === 'he') language = 'he';
} catch { /* Language switching also works when storage is unavailable. */ }

const messages = {
  en: {
    things: 'THINGS', ideas: 'IDEAS', projects: 'PROJECTS', about: 'ABOUT',
    language: 'Language', home: 'CON — return to the beginning',
    archive: 'Explore the archive', canvas: 'CON project canvas',
    title: 'CON — Things, Ideas & Projects',
    description: 'An independent creative project by Neil Cohen. Explore things, ideas and projects. Nothing is for sale.',
    socialDescription: 'Clothing, objects, source material and creative projects.',
    introLabel: 'About CON',
    intro: 'Con is a conglomerate that does not exist. It was conceived and conspired as a theoretical project on Israeli consumer culture, marketing magic and casual propaganda. It works through collaborations. Each one revisits the legacy of Israeli design and makes something for you to consume.',
    desktopHelp: 'Move to explore. Click to look closer.',
    touchHelp: 'Drag to explore. Tap to look closer.',
    gathering: 'Gathering things…', selectedProjects: 'Selected projects',
    close: 'Close project', ideaSource: 'Idea / Source material',
    exploreProject: 'Explore the project', photographs: 'Project photographs',
    previousPhoto: 'Previous photograph', nextPhoto: 'Next photograph',
    idea: 'The idea', behind: 'Behind the thing', theProject: 'The project',
    context: 'Idea / Context', released: 'Released',
    pullClose: 'Close project by pulling', keepPulling: 'Keep pulling to close',
    releaseClose: 'Release to close',
    pause: 'Pause automatic movement', resume: 'Resume automatic movement',
    pauseTitle: 'Pause movement', resumeTitle: 'Resume movement',
    tilt: 'TILT', tiltEnable: 'Explore by tilting your phone', tiltDisable: 'Turn off phone tilt',
    tiltWaiting: 'Hold your phone comfortably. Finding your resting position…',
    tiltReady: 'Tilt gently to explore. Tap TILT to turn it off.',
    tiltDenied: 'Motion access wasn’t allowed. You can still drag to explore.',
    tiltUnavailable: 'Phone tilt isn’t available here. You can still drag to explore.',
    gridSize: 'Grid size', zoomOut: 'Make the grid smaller', zoomIn: 'Make the grid larger',
    zoomChanged: 'Grid size: {percent}%.',
    jerusalem: 'JLM', jerusalemTime: 'Jerusalem time: {time}',
    jerusalemTemperature: 'Jerusalem: {temperature}°C',
    weatherUnavailable: 'Jerusalem temperature is currently unavailable',
    weatherSource: 'Weather data: Open-Meteo · Updated {time}',
    video: 'Video', sourceImage: 'Source image',
    tile: '{title} — {type}. Open {kind}', openIdea: 'idea', openProject: 'project',
    film: '{title} — project film', image: '{title} — project image',
    projectVideo: '{title} — project video', playVideo: 'Play video',
    playYouTube: 'Play video: {title} (opens YouTube in a new tab)',
    photograph: 'Photograph {number} of {total}',
    photoAlt: '{title} — photograph {number}',
    loadingProject: 'Loading project…', projectError: 'The project could not be loaded.',
    retry: 'Try again', retryError: 'Still unable to load this project. Please try again.',
    collectionError: 'The collection could not be loaded.',
    thingsAnnouncement: 'Things. Explore the objects.',
    ideasAnnouncement: 'Ideas. Images, videos and references behind the things.',
    projectsAnnouncement: 'Projects. Selected projects.',
    languageChanged: 'Language changed to English.',
  },
  he: {
    things: 'חפצים', ideas: 'רעיונות', projects: 'פרויקטים', about: 'אודות',
    language: 'שפה', home: 'קון — חזרה להתחלה',
    archive: 'לגלות את הארכיון', canvas: 'מרחב הפרויקטים של קון',
    title: 'קון — חפצים, רעיונות ופרויקטים',
    description: 'פרויקט יצירתי עצמאי של ניל כהן. חפצים, רעיונות ופרויקטים. שום דבר אינו למכירה.',
    socialDescription: 'בגדים, חפצים, חומרי מקור ופרויקטים יצירתיים.',
    introLabel: 'על קון',
    intro: 'קון הוא קונגלומרט שלא קיים. הוא נהגה ונרקם כפרויקט תיאורטי על תרבות צריכה ישראלית, כשפי שיווק ותעמולה יומיומית. הוא פועל דרך שיתופי פעולה. כל אחד מהם חוזר אל מורשת העיצוב הישראלי ובורא ממנה משהו שתוכלו לצרוך.',
    desktopHelp: 'הזיזו את העכבר כדי לטייל. לחצו כדי להתבונן מקרוב.',
    touchHelp: 'גררו כדי לטייל. הקישו כדי להתבונן מקרוב.',
    gathering: 'אוספים חפצים…', selectedProjects: 'פרויקטים נבחרים',
    close: 'סגירת הפרויקט', ideaSource: 'רעיון / חומרי מקור',
    exploreProject: 'לפרויקט המלא', photographs: 'תמונות הפרויקט',
    previousPhoto: 'התמונה הקודמת', nextPhoto: 'התמונה הבאה',
    idea: 'הרעיון', behind: 'מאחורי החפץ', theProject: 'הפרויקט',
    context: 'רעיון / הקשר', released: 'שנת יציאה',
    pullClose: 'סגירת הפרויקט במשיכה', keepPulling: 'המשיכו למשוך לסגירה',
    releaseClose: 'שחררו לסגירה',
    pause: 'עצירת התנועה האוטומטית', resume: 'המשך התנועה האוטומטית',
    pauseTitle: 'עצירת התנועה', resumeTitle: 'המשך התנועה',
    tilt: 'הטיה', tiltEnable: 'לטייל באמצעות הטיית הטלפון', tiltDisable: 'כיבוי השליטה בהטיה',
    tiltWaiting: 'החזיקו את הטלפון בנוחות. מתאימים את תנוחת המנוחה…',
    tiltReady: 'הטו בעדינות כדי לטייל. לחצו על הטיה כדי לכבות.',
    tiltDenied: 'הגישה לחיישני התנועה לא אושרה. אפשר להמשיך לטייל בגרירה.',
    tiltUnavailable: 'שליטה בהטיה אינה זמינה כאן. אפשר להמשיך לטייל בגרירה.',
    gridSize: 'גודל הגריד', zoomOut: 'הקטנת הגריד', zoomIn: 'הגדלת הגריד',
    zoomChanged: 'גודל הגריד: {percent}%.',
    jerusalem: 'JLM', jerusalemTime: 'השעה בירושלים: {time}',
    jerusalemTemperature: 'ירושלים: {temperature} מעלות צלזיוס',
    weatherUnavailable: 'הטמפרטורה בירושלים אינה זמינה כרגע',
    weatherSource: 'נתוני מזג אוויר: Open-Meteo · עודכן ב־{time}',
    video: 'וידאו', sourceImage: 'תמונת מקור',
    tile: '{title} — {type}. פתיחת {kind}', openIdea: 'הרעיון', openProject: 'הפרויקט',
    film: '{title} — סרטון הפרויקט', image: '{title} — תמונת הפרויקט',
    projectVideo: '{title} — וידאו מהפרויקט', playVideo: 'לצפייה בווידאו',
    playYouTube: 'צפייה בווידאו: {title} (פתיחת YouTube בלשונית חדשה)',
    photograph: 'תמונה {number} מתוך {total}',
    photoAlt: '{title} — תמונה {number}',
    loadingProject: 'טוענים את הפרויקט…', projectError: 'לא ניתן לטעון את הפרויקט.',
    retry: 'ניסיון נוסף', retryError: 'עדיין לא ניתן לטעון את הפרויקט. נסו שוב.',
    collectionError: 'לא ניתן לטעון את האוסף.',
    thingsAnnouncement: 'חפצים. לטייל בין הפריטים.',
    ideasAnnouncement: 'רעיונות. תמונות, סרטונים ומקורות שמאחורי החפצים.',
    projectsAnnouncement: 'פרויקטים. פרויקטים נבחרים.',
    languageChanged: 'השפה הוחלפה לעברית.',
  }
};

const hebrewTerms = {
  'Ceramic Hanukkiah': 'חנוכיית קרמיקה',
  'Screen-printed T-shirt': 'חולצת טי בהדפס רשת',
  'Objects & containers': 'חפצים ומכלים',
  'Printed T-shirt': 'חולצת טי מודפסת',
  'Canvas tote': 'תיק קנבס',
  'Nine postcards': 'תשע גלויות',
  'Printed sweatshirt': 'סווטשירט מודפס',
  'Embroidered hoodie': 'קפוצ׳ון רקום',
  'Hoodie & sweatshirt': 'קפוצ׳ון וסווטשירט',
  'Embroidered socks': 'גרביים רקומים',
  'Website': 'אתר',
  'Social design initiative': 'יוזמת עיצוב חברתי',
  'Art & Culture': 'אמנות ותרבות',
  'Exhibition & visual culture': 'תערוכה ותרבות חזותית',
  'Con × Hafontia × Dan Reisinger Estate': 'קון × הפונטיה × עיזבון דן ריזינגר',
  'Con × Jerusalem Design Week': 'קון × שבוע העיצוב ירושלים',
  'Hafontia': 'הפונטיה',
  'CON / Haachim': 'קון / האחים',
};

let content = { projects: {}, blocks: { en: {}, he: {} } };
export function configureContent(value) { content = value; }
export function setLanguage(value) {
  if (!['en', 'he'].includes(value)) return;
  language = value;
  try { localStorage.setItem(STORAGE_KEY, value); } catch { /* Optional persistence. */ }
}
export const direction = () => language === 'he' ? 'rtl' : 'ltr';
export function t(key, values = {}) {
  return (messages[language][key] || messages.en[key] || key)
    .replace(/\{(\w+)\}/g, (_, name) => values[name] ?? '');
}

export function localizeBlock(block) {
  const translation = content.blocks[language]?.[(block.text || '').trim()];
  return translation ? { ...block, ...translation } : block;
}

// Originals and media references remain untouched; translations are a display layer.
export function localizeProject(project) {
  const overrides = content.projects[project.id]?.[language] || {};
  const item = { ...project, ...overrides, direction: direction() };
  if (language === 'he') {
    item.objectType = hebrewTerms[item.objectType] || item.objectType;
    item.collaboration = hebrewTerms[item.collaboration] || item.collaboration;
  }
  if (item.website && overrides.websiteLabel) item.website = { ...item.website, label: overrides.websiteLabel };
  if (project.productDescription) item.productDescription = {
    ...project.productDescription, blocks: project.productDescription.blocks.map(localizeBlock)
  };
  if (project.projectContent) item.projectContent = project.projectContent.map(section => ({
    ...section, blocks: (section.blocks || []).map(localizeBlock)
  }));
  return item;
}
