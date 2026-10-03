import { Subject, Prize, Achievement, LeaderboardEntry } from './types';

export const SUBJECTS: Subject[] = [
  {
    id: 'math',
    name: 'Математика',
    iconName: 'Calculator',
    description: 'Развиваем логическое мышление, пространственное воображение и нестандартный подход к задачам.',
    colorClass: 'from-primary to-accent-dark',
    bgClass: 'bg-blue-50/50',
    borderClass: 'border-blue-100',
    textClass: 'text-blue-600',
    difficulty: 'Средний',
    quests: [
      { id: 'math-q1', title: 'Логический страж', description: 'Решить первую головоломку на логику', starsReward: 5, xpReward: 20, isCompleted: false },
      { id: 'math-q2', title: 'Архитектор чисел', description: 'Разгадать числовой паттерн', starsReward: 10, xpReward: 40, isCompleted: false },
    ],
    quiz: [
      {
        id: 'math-1',
        question: 'Улитка ползет вверх по дереву высотой 10 метров. Днем она поднимается на 3 метра, а ночью спускается на 2 метра. За сколько дней она доползет до верхушки?',
        options: ['За 10 дней', 'За 8 дней', 'За 7 дней', 'За 9 дней'],
        correctAnswerIndex: 1, // At the end of day 7, she is at 7m. On day 8 she climbs 3m and reaches 10m.
        explanation: 'Отличная логика! К концу 7-го дня улитка будет на высоте 7 метров. На 8-й день она поднимется еще на 3 метра и достигнет вершины (10 м), уже не спускаясь ночью.'
      },
      {
        id: 'math-2',
        question: 'Какое число должно стоять вместо знака вопроса в ряду: 2, 6, 12, 20, 30, ?',
        options: ['40', '42', '36', '45'],
        correctAnswerIndex: 1, // Differences are +4, +6, +8, +10, +12 -> 30 + 12 = 42
        explanation: 'Верно! Разница между числами увеличивается на 2 с каждым шагом: +4, +6, +8, +10. Следующий шаг — прибавить 12, получаем 30 + 12 = 42.'
      },
      {
        id: 'math-3',
        question: 'Если сложить самое большое двузначное число и самое маленькое трехзначное число, что получится?',
        options: ['199', '200', '109', '189'],
        correctAnswerIndex: 0, // 99 + 100 = 199
        explanation: 'Супер! 99 (самое большое двузначное) + 100 (самое маленькое трехзначное) = 199.'
      }
    ]
  },
  {
    id: 'it',
    name: 'IT & Программирование',
    iconName: 'Code2',
    description: 'Учимся программировать на Python, создавать сайты на React и разрабатывать крутые мобильные приложения.',
    colorClass: 'from-emerald-500 to-teal-600',
    bgClass: 'bg-emerald-50/50',
    borderClass: 'border-emerald-100',
    textClass: 'text-emerald-600',
    difficulty: 'Продвинутый',
    quests: [
      { id: 'it-q1', title: 'Hello World', description: 'Написать свою первую строчку кода', starsReward: 5, xpReward: 20, isCompleted: false },
      { id: 'it-q2', title: 'Повелитель циклов', description: 'Запустить бесконечный цикл без багов', starsReward: 10, xpReward: 40, isCompleted: false },
    ],
    quiz: [
      {
        id: 'it-1',
        question: 'Что выведет команда print("Study" + " " + "Task") в языке Python?',
        options: ['StudyTask', 'Study Task', 'Error', 'Study+Task'],
        correctAnswerIndex: 1,
        explanation: 'Идеально! Оператор "+" складывает (конкатенирует) строки. Мы сложили "Study", пробел " " и "Task", получив красивое "Study Task".'
      },
      {
        id: 'it-2',
        question: 'Какое животное является символом самого популярного языка программирования для начинающих?',
        options: ['Змея (Python)', 'Кот (Scratch)', 'Хамелеон', 'Слон (PHP)'],
        correctAnswerIndex: 0,
        explanation: 'Точно! Язык Python назван в честь комик-группы Монти Пайтон, но его символом является змея питон.'
      },
      {
        id: 'it-3',
        question: 'Что в программировании называют "багом" (bug)?',
        options: ['Быстрый интернет', 'Ошибку в коде программы', 'Компьютерную мышь', 'Тип базы данных'],
        correctAnswerIndex: 1,
        explanation: 'Абсолютно верно! "Баг" — это ошибка или дефект в программе, мешающий ей правильно работать.'
      }
    ]
  },
  {
    id: 'physics',
    name: 'Физика',
    iconName: 'Atom',
    description: 'Раскрываем тайны гравитации, электричества, звука и космических путешествий через наглядные эксперименты.',
    colorClass: 'from-sky-500 to-blue-600',
    bgClass: 'bg-sky-50/50',
    borderClass: 'border-sky-100',
    textClass: 'text-sky-600',
    difficulty: 'Продвинутый',
    quests: [
      { id: 'phys-q1', title: 'Сила Ньютона', description: 'Поймать падающее яблоко в симуляции', starsReward: 5, xpReward: 20, isCompleted: false },
      { id: 'phys-q2', title: 'Генератор Теслы', description: 'Зажечь лампочку статическим зарядом', starsReward: 10, xpReward: 40, isCompleted: false },
    ],
    quiz: [
      {
        id: 'phys-1',
        question: 'Что упадет быстрее в вакууме (где вообще нет воздуха): пушинка или тяжелая железная гиря?',
        options: ['Гиря', 'Пушинка', 'Они упадут одновременно', 'Они улетят вверх'],
        correctAnswerIndex: 2,
        explanation: 'Физика — сила! В вакууме нет сопротивления воздуха, поэтому сила тяжести разгоняет любые предметы с одинаковым ускорением. Они упадут одновременно!'
      },
      {
        id: 'phys-2',
        question: 'В каком состоянии молекулы воды находятся ближе всего друг к другу и упорядочены в решетку?',
        options: ['В жидком (вода)', 'В твердом (лед)', 'В газообразном (пар)', 'В состоянии плазмы'],
        correctAnswerIndex: 1,
        explanation: 'Супер! В твердом состоянии (лед) молекулы воды зафиксированы в узлах кристаллической решетки.'
      },
      {
        id: 'phys-3',
        question: 'Какое физическое явление объясняет, почему ложка в стакане с водой кажется надломленной?',
        options: ['Преломление света', 'Отражение света', 'Дифракция', 'Поглощение света'],
        correctAnswerIndex: 0,
        explanation: 'Замечательно! Это преломление (рефракция) света на границе воздуха и воды из-за разной скорости распространения света в этих средах.'
      }
    ]
  },
  {
    id: 'english',
    name: 'Английский язык',
    iconName: 'Languages',
    description: 'Разрушаем языковой барьер, изучаем живую лексику, песни, игры и начинаем говорить уже на первом уроке.',
    colorClass: 'from-amber-500 to-orange-600',
    bgClass: 'bg-amber-50/50',
    borderClass: 'border-amber-100',
    textClass: 'text-amber-600',
    difficulty: 'Легкий',
    quests: [
      { id: 'eng-q1', title: 'Полиглот', description: 'Выучить 10 новых космических фраз', starsReward: 5, xpReward: 20, isCompleted: false },
      { id: 'eng-q2', title: 'Дипломат', description: 'Закончить диалог с ИИ-учителем', starsReward: 10, xpReward: 40, isCompleted: false },
    ],
    quiz: [
      {
        id: 'eng-1',
        question: 'Как переводится популярная идиома "It is raining cats and dogs"?',
        options: ['Идет дождь из кошек и собак', 'Льет как из ведра (сильный ливень)', 'Животные выбежали на улицу', 'Очень шумно'],
        correctAnswerIndex: 1,
        explanation: 'Фантастика! Это классическое английское образное выражение, означающее очень сильный ливень.'
      },
      {
        id: 'eng-2',
        question: 'Какое слово пропущено в известной поговорке: "An apple a day keeps the _____ away"?',
        options: ['teacher', 'doctor', 'problem', 'bad mood'],
        correctAnswerIndex: 1,
        explanation: 'Прекрасно! "An apple a day keeps the doctor away" дословно означает: "Яблоко в день избавит от визитов к врачу".'
      },
      {
        id: 'eng-3',
        question: 'Какое время используется для выражения действия, происходящего прямо сейчас, в момент речи?',
        options: ['Present Simple', 'Present Continuous', 'Past Simple', 'Future Simple'],
        correctAnswerIndex: 1,
        explanation: 'Правильно! Present Continuous (например, "I am studying now") используется для действий в момент разговора.'
      }
    ]
  },
  {
    id: 'russian',
    name: 'Русский язык',
    iconName: 'BookMarked',
    description: 'Повышаем грамотность без скучной зубрежки, учимся красиво излагать мысли и писать яркие сочинения.',
    colorClass: 'from-violet-500 to-purple-600',
    bgClass: 'bg-violet-50/50',
    borderClass: 'border-violet-100',
    textClass: 'text-violet-600',
    difficulty: 'Легкий',
    quests: [
      { id: 'rus-q1', title: 'Орфограф', description: 'Написать диктант без единой помарки', starsReward: 5, xpReward: 20, isCompleted: false },
      { id: 'rus-q2', title: 'Мастер метафор', description: 'Найти все эпитеты в стихотворении', starsReward: 10, xpReward: 40, isCompleted: false },
    ],
    quiz: [
      {
        id: 'rus-1',
        question: 'Как правильно пишется слово для проверки грамотности?',
        options: ['Венегрет', 'Винигрет', 'Винегрет', 'Венигрет'],
        correctAnswerIndex: 2,
        explanation: 'Умница! Слово пишется "винегрет" (от французского vinaigre — уксус). Запомни две буквы "и" и "е"!'
      },
      {
        id: 'rus-2',
        question: 'Какое из этих слов является антонимом к слову "Трудолюбивый"?',
        options: ['Ленивый', 'Прилежный', 'Активный', 'Заботливый'],
        correctAnswerIndex: 0,
        explanation: 'Верно! Антонимы — слова с противоположным значением. Противоположность трудолюбивому — ленивый.'
      },
      {
        id: 'rus-3',
        question: 'Какая часть речи обозначает действие предмета и отвечает на вопросы "что делать?", "что сделать?"?',
        options: ['Существительное', 'Прилагательное', 'Глагол', 'Наречие'],
        correctAnswerIndex: 2,
        explanation: 'Отлично! Глагол — это самостоятельная часть речи, которая обозначает действие предмета.'
      }
    ]
  }
];

export const PRIZES: Prize[] = [
  {
    id: 'prize-stickers',
    name: 'Геймерский стикерпак',
    description: 'Набор крутых виниловых наклеек с героями Study Task для ноутбука или тетради.',
    cost: 15,
    unlockedAtLevel: 1,
    iconName: 'Smile',
    category: 'Стикеры'
  },
  {
    id: 'prize-cap',
    name: 'Фирменная кепка Study Task',
    description: 'Стильная сине-белая кепка с регулируемым ремешком и вышитым логотипом.',
    cost: 35,
    unlockedAtLevel: 2,
    iconName: 'Crown',
    category: 'Мерч'
  },
  {
    id: 'prize-bottle',
    name: 'Спортивная бутылка',
    description: 'Герметичная алюминиевая бутылка для воды с карабином для крепления к рюкзаку.',
    cost: 50,
    unlockedAtLevel: 3,
    iconName: 'CupSoda',
    category: 'Мерч'
  },
  {
    id: 'prize-tshirt',
    name: 'Оверзайз худи Study Task',
    description: 'Теплая брендированная кофта с капюшоном и уникальным принтом "Учись как в игре".',
    cost: 85,
    unlockedAtLevel: 4,
    iconName: 'Shirt',
    category: 'Мерч'
  },
  {
    id: 'prize-headphones',
    name: 'Беспроводные наушники',
    description: 'Накладные Bluetooth наушники с активным шумоподавлением для идеальной концентрации на уроках.',
    cost: 150,
    unlockedAtLevel: 5,
    iconName: 'Headphones',
    category: 'Гаджеты'
  },
  {
    id: 'prize-tablet',
    name: 'Планшет для учебы',
    description: 'Современный 10-дюймовый планшет со стилусом для интерактивных квизов и презентаций!',
    cost: 300,
    unlockedAtLevel: 6,
    iconName: 'Tablet',
    category: 'Гаджеты'
  }
];

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'ach-first', name: 'Первый шаг', description: 'Завершить первую викторину на лендинге', iconName: 'Compass', color: 'bg-blue-500', unlocked: false },
  { id: 'ach-nerd', name: 'Умник-отличник', description: 'Ответить правильно на все вопросы одного предмета', iconName: 'CheckCircle2', color: 'bg-emerald-500', unlocked: false },
  { id: 'ach-star-collector', name: 'Звездный магнат', description: 'Накопить 25 звезд на балансе', iconName: 'Sparkles', color: 'bg-amber-500', unlocked: false, requiredStars: 25 },
  { id: 'ach-level-up', name: 'Герой викторин', description: 'Достичь 3 уровня профиля на лендинге', iconName: 'Trophy', color: 'bg-primary', unlocked: false, requiredLevel: 3 },
  { id: 'ach-shopper', name: 'Первый заказ', description: 'Обменять свои звезды на подарок в магазине', iconName: 'ShoppingBag', color: 'bg-accent', unlocked: false },
];

export const INITIAL_LEADERBOARD: LeaderboardEntry[] = [
  { id: 'l-1', rank: 1, name: 'Алихан М.', stars: 345, level: 7, avatarSeed: 'alihan' },
  { id: 'l-2', rank: 2, name: 'София К.', stars: 290, level: 6, avatarSeed: 'sofia' },
  { id: 'l-3', rank: 3, name: 'Дамир Т.', stars: 250, level: 5, avatarSeed: 'damir' },
  { id: 'l-4', rank: 4, name: 'Аружан С.', stars: 185, level: 4, avatarSeed: 'aruzhan' },
  { id: 'l-5', rank: 5, name: 'Максим В.', stars: 140, level: 3, avatarSeed: 'maxim' },
  { id: 'l-6', rank: 6, name: 'Алина Б.', stars: 95, level: 2, avatarSeed: 'alina' },
];
