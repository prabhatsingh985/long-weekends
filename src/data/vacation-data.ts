import type { VacationPlan } from "../types";

export const CURRENT_DATE_REF = "2026-08-19";

export const VACATION_PLANS_2026: VacationPlan[] = [
  // 0 LEAVES PLANS
  {
    id: "plan-rakhi-0",
    title: "Raksha Bandhan Long Weekend",
    month: "08",
    startDate: "2026-08-28",
    endDate: "2026-08-30",
    leavesRequired: 0,
    totalDaysOff: 3,
    state: ["ALL", "DL", "NORTH"],
    efficiencyMultiplier: "3.0x Free",
    vibe: "🏖️ Rishikesh / Mussoorie / Staycation",
    formula: "Friday Holiday (28 Aug) + Sat + Sun",
    themes: ["staycation", "mountains", "river", "family", "weekend"],
    recommendedSpots: ["Rishikesh", "Mussoorie", "Jaipur", "Alibaug"],
    days: [
      { date: "2026-08-28", dayName: "Fri", dayNum: "28", type: "holiday", label: "Raksha Bandhan" },
      { date: "2026-08-29", dayName: "Sat", dayNum: "29", type: "weekend", label: "Weekend" },
      { date: "2026-08-30", dayName: "Sun", dayNum: "30", type: "weekend", label: "Weekend" }
    ]
  },
  {
    id: "plan-janmashtami-0",
    title: "Janmashtami Long Weekend",
    month: "09",
    startDate: "2026-09-04",
    endDate: "2026-09-06",
    leavesRequired: 0,
    totalDaysOff: 3,
    state: ["ALL"],
    efficiencyMultiplier: "3.0x Free",
    vibe: "🏖️ Gokarna / Lonavala / Mathura",
    formula: "Friday Holiday (4 Sep) + Sat + Sun",
    themes: ["beach", "mountains", "culture", "weekend", "monsoon"],
    recommendedSpots: ["Gokarna", "Lonavala", "Mathura", "Udaipur"],
    days: [
      { date: "2026-09-04", dayName: "Fri", dayNum: "04", type: "holiday", label: "Janmashtami" },
      { date: "2026-09-05", dayName: "Sat", dayNum: "05", type: "weekend", label: "Weekend" },
      { date: "2026-09-06", dayName: "Sun", dayNum: "06", type: "weekend", label: "Weekend" }
    ]
  },
  {
    id: "plan-ganesh-0",
    title: "Ganesh Chaturthi Long Weekend",
    month: "09",
    startDate: "2026-09-12",
    endDate: "2026-09-14",
    leavesRequired: 0,
    totalDaysOff: 3,
    state: ["WEST", "SOUTH", "MH", "KA", "ALL"],
    efficiencyMultiplier: "3.0x Free",
    vibe: "🏖️ Alibaug / Mahabaleshwar / Coorg",
    formula: "Sat + Sun + Monday Holiday (14 Sep)",
    themes: ["beach", "hills", "culture", "weekend"],
    recommendedSpots: ["Alibaug", "Mahabaleshwar", "Coorg", "Pondicherry"],
    days: [
      { date: "2026-09-12", dayName: "Sat", dayNum: "12", type: "weekend", label: "Weekend" },
      { date: "2026-09-13", dayName: "Sun", dayNum: "13", type: "weekend", label: "Weekend" },
      { date: "2026-09-14", dayName: "Mon", dayNum: "14", type: "holiday", label: "Ganesh Chaturthi" }
    ]
  },
  {
    id: "plan-gandhi-0",
    title: "Gandhi Jayanti Long Weekend",
    month: "10",
    startDate: "2026-10-02",
    endDate: "2026-10-04",
    leavesRequired: 0,
    totalDaysOff: 3,
    state: ["ALL"],
    efficiencyMultiplier: "3.0x Free",
    vibe: "🏖️ Goa / Pondicherry / Chikmagalur",
    formula: "Friday Holiday (2 Oct) + Sat + Sun",
    themes: ["beach", "party", "coffee estates", "weekend"],
    recommendedSpots: ["Goa", "Pondicherry", "Chikmagalur", "Wayanad"],
    days: [
      { date: "2026-10-02", dayName: "Fri", dayNum: "02", type: "holiday", label: "Gandhi Jayanti" },
      { date: "2026-10-03", dayName: "Sat", dayNum: "03", type: "weekend", label: "Weekend" },
      { date: "2026-10-04", dayName: "Sun", dayNum: "04", type: "weekend", label: "Weekend" }
    ]
  },
  {
    id: "plan-ayudha-dussehra-0",
    title: "Maha Navami & Dussehra Mega 4-Day Off",
    month: "10",
    startDate: "2026-10-17",
    endDate: "2026-10-20",
    leavesRequired: 0,
    totalDaysOff: 4,
    state: ["SOUTH", "EAST", "KA", "TN", "WB"],
    efficiencyMultiplier: "4.0x Free",
    vibe: "🏖️ Mysore (Dasara) / Hampi / Darjeeling",
    formula: "Sat + Sun + Mon (Ayudha Puja) + Tue (Dussehra)",
    themes: ["heritage", "culture", "mountains", "festival"],
    recommendedSpots: ["Mysore Palace", "Hampi", "Darjeeling", "Madurai"],
    days: [
      { date: "2026-10-17", dayName: "Sat", dayNum: "17", type: "weekend", label: "Weekend" },
      { date: "2026-10-18", dayName: "Sun", dayNum: "18", type: "weekend", label: "Weekend" },
      { date: "2026-10-19", dayName: "Mon", dayNum: "19", type: "holiday", label: "Ayudha Puja" },
      { date: "2026-10-20", dayName: "Tue", dayNum: "20", type: "holiday", label: "Dussehra" }
    ]
  },
  {
    id: "plan-govardhan-bhai-0",
    title: "Diwali & Bhai Dooj 4-Day Festive Break",
    month: "11",
    startDate: "2026-11-07",
    endDate: "2026-11-10",
    leavesRequired: 0,
    totalDaysOff: 4,
    state: ["ALL", "NORTH", "WEST", "DL", "MH"],
    efficiencyMultiplier: "4.0x Free",
    vibe: "🪔 Family Celebration / Udaipur / Jaipur",
    formula: "Sat + Sun (Diwali) + Mon (Govardhan) + Tue (Bhai Dooj)",
    themes: ["festival", "palaces", "family", "culture"],
    recommendedSpots: ["Udaipur", "Jaipur", "Varanasi", "Jaisalmer"],
    days: [
      { date: "2026-11-07", dayName: "Sat", dayNum: "07", type: "weekend", label: "Weekend" },
      { date: "2026-11-08", dayName: "Sun", dayNum: "08", type: "holiday", label: "Diwali" },
      { date: "2026-11-09", dayName: "Mon", dayNum: "09", type: "holiday", label: "Govardhan Puja" },
      { date: "2026-11-10", dayName: "Tue", dayNum: "10", type: "holiday", label: "Bhai Dooj" }
    ]
  },
  {
    id: "plan-kanakadasa-0",
    title: "Kanakadasa Jayanti 3-Day Weekend",
    month: "11",
    startDate: "2026-11-27",
    endDate: "2026-11-29",
    leavesRequired: 0,
    totalDaysOff: 3,
    state: ["SOUTH", "KA"],
    efficiencyMultiplier: "3.0x Free",
    vibe: "🏖️ Wayanad / Kabini / Dandeli",
    formula: "Friday Holiday (27 Nov) + Sat + Sun",
    themes: ["wildlife", "rainforest", "jungle safari"],
    recommendedSpots: ["Kabini", "Wayanad", "Dandeli", "Bandipur"],
    days: [
      { date: "2026-11-27", dayName: "Fri", dayNum: "27", type: "holiday", label: "Kanakadasa Jayanti" },
      { date: "2026-11-28", dayName: "Sat", dayNum: "28", type: "weekend", label: "Weekend" },
      { date: "2026-11-29", dayName: "Sun", dayNum: "29", type: "weekend", label: "Weekend" }
    ]
  },
  {
    id: "plan-christmas-0",
    title: "Christmas 3-Day Year-End Weekend",
    month: "12",
    startDate: "2026-12-25",
    endDate: "2026-12-27",
    leavesRequired: 0,
    totalDaysOff: 3,
    state: ["ALL"],
    efficiencyMultiplier: "3.0x Free",
    vibe: "🎄 Goa / Manali / Shillong",
    formula: "Friday Holiday (25 Dec) + Sat + Sun",
    themes: ["beach", "party", "snow", "mountains"],
    recommendedSpots: ["Goa", "Manali", "Shillong", "Kochi"],
    days: [
      { date: "2026-12-25", dayName: "Fri", dayNum: "25", type: "holiday", label: "Christmas" },
      { date: "2026-12-26", dayName: "Sat", dayNum: "26", type: "weekend", label: "Weekend" },
      { date: "2026-12-27", dayName: "Sun", dayNum: "27", type: "weekend", label: "Weekend" }
    ]
  },

  // 1 LEAVE PLANS
  {
    id: "plan-milad-1",
    title: "Milad-un-Nabi & Rakhi 5-Day Bridge",
    month: "08",
    startDate: "2026-08-26",
    endDate: "2026-08-30",
    leavesRequired: 1,
    totalDaysOff: 5,
    state: ["ALL", "NORTH", "DL"],
    efficiencyMultiplier: "5.0x Multiplier",
    vibe: "🏖️ Leh Ladakh / Kashmir / Udaipur",
    formula: "Wed (Milad) + 1 Leave (Thu 27 Aug) + Fri (Rakhi) + Sat + Sun",
    themes: ["mountains", "lakes", "monsoon escape", "heritage"],
    recommendedSpots: ["Leh Ladakh", "Kashmir", "Udaipur", "Spiti Valley"],
    days: [
      { date: "2026-08-26", dayName: "Wed", dayNum: "26", type: "holiday", label: "Milad-un-Nabi" },
      { date: "2026-08-27", dayName: "Thu", dayNum: "27", type: "leave", label: "Take PTO 🎯" },
      { date: "2026-08-28", dayName: "Fri", dayNum: "28", type: "holiday", label: "Raksha Bandhan" },
      { date: "2026-08-29", dayName: "Sat", dayNum: "29", type: "weekend", label: "Weekend" },
      { date: "2026-08-30", dayName: "Sun", dayNum: "30", type: "weekend", label: "Weekend" }
    ]
  },
  {
    id: "plan-dussehra-1",
    title: "Dussehra 4-Day Smart Bridge",
    month: "10",
    startDate: "2026-10-17",
    endDate: "2026-10-20",
    leavesRequired: 1,
    totalDaysOff: 4,
    state: ["ALL", "WEST", "NORTH", "MH", "DL"],
    efficiencyMultiplier: "4.0x Multiplier",
    vibe: "🏖️ Goa / Varanasi / Jodhpur / Munnar",
    formula: "Sat + Sun + 1 Leave (Mon 19 Oct) + Tue (Dussehra 20 Oct)",
    themes: ["beach", "party", "heritage", "tea gardens"],
    recommendedSpots: ["Goa (North & South)", "Munnar", "Jodhpur", "Varanasi"],
    days: [
      { date: "2026-10-17", dayName: "Sat", dayNum: "17", type: "weekend", label: "Weekend" },
      { date: "2026-10-18", dayName: "Sun", dayNum: "18", type: "weekend", label: "Weekend" },
      { date: "2026-10-19", dayName: "Mon", dayNum: "19", type: "leave", label: "Take PTO 🎯" },
      { date: "2026-10-20", dayName: "Tue", dayNum: "20", type: "holiday", label: "Dussehra" }
    ]
  },
  {
    id: "plan-guru-nanak-1",
    title: "Guru Nanak Jayanti 4-Day Bridge",
    month: "11",
    startDate: "2026-11-21",
    endDate: "2026-11-24",
    leavesRequired: 1,
    totalDaysOff: 4,
    state: ["ALL"],
    efficiencyMultiplier: "4.0x Multiplier",
    vibe: "🏖️ Amritsar (Golden Temple) / Agra / Shimla",
    formula: "Sat + Sun + 1 Leave (Mon 23 Nov) + Tue (Guru Nanak Jayanti 24 Nov)",
    themes: ["culture", "spiritual", "hills", "food tour"],
    recommendedSpots: ["Amritsar", "Shimla", "Agra", "Chandigarh"],
    days: [
      { date: "2026-11-21", dayName: "Sat", dayNum: "21", type: "weekend", label: "Weekend" },
      { date: "2026-11-22", dayName: "Sun", dayNum: "22", type: "weekend", label: "Weekend" },
      { date: "2026-11-23", dayName: "Mon", dayNum: "23", type: "leave", label: "Take PTO 🎯" },
      { date: "2026-11-24", dayName: "Tue", dayNum: "24", type: "holiday", label: "Guru Nanak Jayanti" }
    ]
  },

  // 2 LEAVES PLANS
  {
    id: "plan-diwali-2",
    title: "Diwali & Bhai Dooj 9-Day Mega Vacation",
    month: "11",
    startDate: "2026-11-07",
    endDate: "2026-11-15",
    leavesRequired: 2,
    totalDaysOff: 9,
    state: ["ALL", "NORTH", "WEST", "SOUTH", "DL", "MH", "KA"],
    efficiencyMultiplier: "4.5x Mega Return",
    vibe: "🚀 Thailand / Vietnam / Dubai / Kashmir",
    formula: "Sat + Sun (Diwali) + Mon (Govardhan) + Tue (Bhai Dooj) + 2 Leaves (Wed 11 & Thu 12) + Fri 13 + Sat + Sun",
    themes: ["international", "beach", "luxury", "festival", "family"],
    recommendedSpots: ["Phuket (Thailand)", "Bali (Indonesia)", "Dubai", "Kashmir Valley"],
    days: [
      { date: "2026-11-07", dayName: "Sat", dayNum: "07", type: "weekend", label: "Weekend" },
      { date: "2026-11-08", dayName: "Sun", dayNum: "08", type: "holiday", label: "Diwali" },
      { date: "2026-11-09", dayName: "Mon", dayNum: "09", type: "holiday", label: "Govardhan Puja" },
      { date: "2026-11-10", dayName: "Tue", dayNum: "10", type: "holiday", label: "Bhai Dooj" },
      { date: "2026-11-11", dayName: "Wed", dayNum: "11", type: "leave", label: "Take PTO 🎯" },
      { date: "2026-11-12", dayName: "Thu", dayNum: "12", type: "leave", label: "Take PTO 🎯" },
      { date: "2026-11-13", dayName: "Fri", dayNum: "13", type: "leave", label: "Bridge / PTO" },
      { date: "2026-11-14", dayName: "Sat", dayNum: "14", type: "weekend", label: "Weekend" },
      { date: "2026-11-15", dayName: "Sun", dayNum: "15", type: "weekend", label: "Weekend" }
    ]
  },
  {
    id: "plan-durga-puja-2",
    title: "Durga Puja Carnival 9-Day Mega Vacation",
    month: "10",
    startDate: "2026-10-17",
    endDate: "2026-10-25",
    leavesRequired: 2,
    totalDaysOff: 9,
    state: ["EAST", "WB", "ALL"],
    efficiencyMultiplier: "4.5x Mega Return",
    vibe: "🚀 Kolkata Durga Puja Pandal Hopping / Sikkim",
    formula: "Sat 17 + Sun (Saptami) + Mon (Navami) + Tue (Dussehra) + Wed (Dashami) + 2 Leaves (Thu 22 & Fri 23) + Sat + Sun",
    themes: ["festival", "culture", "mountains", "food"],
    recommendedSpots: ["Kolkata", "Gangtok (Sikkim)", "Darjeeling", "Andamans"],
    days: [
      { date: "2026-10-17", dayName: "Sat", dayNum: "17", type: "weekend", label: "Weekend" },
      { date: "2026-10-18", dayName: "Sun", dayNum: "18", type: "holiday", label: "Maha Saptami" },
      { date: "2026-10-19", dayName: "Mon", dayNum: "19", type: "holiday", label: "Maha Navami" },
      { date: "2026-10-20", dayName: "Tue", dayNum: "20", type: "holiday", label: "Dussehra" },
      { date: "2026-10-21", dayName: "Wed", dayNum: "21", type: "holiday", label: "Vijaya Dashami" },
      { date: "2026-10-22", dayName: "Thu", dayNum: "22", type: "leave", label: "Take PTO 🎯" },
      { date: "2026-10-23", dayName: "Fri", dayNum: "23", type: "leave", label: "Take PTO 🎯" },
      { date: "2026-10-24", dayName: "Sat", dayNum: "24", type: "weekend", label: "Weekend" },
      { date: "2026-10-25", dayName: "Sun", dayNum: "25", type: "weekend", label: "Weekend" }
    ]
  },

  // 3 LEAVES PLANS
  {
    id: "plan-gandhi-3",
    title: "Gandhi Jayanti 9-Day Autumn Break",
    month: "10",
    startDate: "2026-09-26",
    endDate: "2026-10-04",
    leavesRequired: 3,
    totalDaysOff: 9,
    state: ["ALL"],
    efficiencyMultiplier: "3.0x Multiplier",
    vibe: "🚀 Bhutan / Nepal / Himachal Road Trip",
    formula: "Sat + Sun + 3 Leaves (Mon 28, Tue 29, Wed 30) + Thu + Fri (Gandhi Jayanti) + Sat + Sun",
    themes: ["trek", "international", "mountains", "nature"],
    recommendedSpots: ["Bhutan", "Kathmandu (Nepal)", "Manali & Kasol", "Meghalaya"],
    days: [
      { date: "2026-09-26", dayName: "Sat", dayNum: "26", type: "weekend", label: "Weekend" },
      { date: "2026-09-27", dayName: "Sun", dayNum: "27", type: "weekend", label: "Weekend" },
      { date: "2026-09-28", dayName: "Mon", dayNum: "28", type: "leave", label: "Take PTO 🎯" },
      { date: "2026-09-29", dayName: "Tue", dayNum: "29", type: "leave", label: "Take PTO 🎯" },
      { date: "2026-09-30", dayName: "Wed", dayNum: "30", type: "leave", label: "Take PTO 🎯" },
      { date: "2026-10-01", dayName: "Thu", dayNum: "01", type: "leave", label: "Bridge / PTO" },
      { date: "2026-10-02", dayName: "Fri", dayNum: "02", type: "holiday", label: "Gandhi Jayanti" },
      { date: "2026-10-03", dayName: "Sat", dayNum: "03", type: "weekend", label: "Weekend" },
      { date: "2026-10-04", dayName: "Sun", dayNum: "04", type: "weekend", label: "Weekend" }
    ]
  },

  // 4+ LEAVES PLANS
  {
    id: "plan-xmas-newyear-4",
    title: "Christmas to New Year 10-Day Year-End Odyssey",
    month: "12",
    startDate: "2026-12-25",
    endDate: "2027-01-03",
    leavesRequired: 4,
    totalDaysOff: 10,
    state: ["ALL"],
    efficiencyMultiplier: "2.5x Mega Year-End",
    vibe: "🚀 Europe / Japan / Bali / North East India",
    formula: "Fri (Christmas 25 Dec) + Sat + Sun + 4 Leaves (Mon 28, Tue 29, Wed 30, Thu 31) + Fri (New Year) + Sat + Sun",
    themes: ["international", "snow", "party", "beach", "new year"],
    recommendedSpots: ["Tokyo (Japan)", "Bali", "Paris & Switzerland", "Goa Sunburn"],
    days: [
      { date: "2026-12-25", dayName: "Fri", dayNum: "25", type: "holiday", label: "Christmas" },
      { date: "2026-12-26", dayName: "Sat", dayNum: "26", type: "weekend", label: "Weekend" },
      { date: "2026-12-27", dayName: "Sun", dayNum: "27", type: "weekend", label: "Weekend" },
      { date: "2026-12-28", dayName: "Mon", dayNum: "28", type: "leave", label: "Take PTO 🎯" },
      { date: "2026-12-29", dayName: "Tue", dayNum: "29", type: "leave", label: "Take PTO 🎯" },
      { date: "2026-12-30", dayName: "Wed", dayNum: "30", type: "leave", label: "Take PTO 🎯" },
      { date: "2026-12-31", dayName: "Thu", dayNum: "31", type: "leave", label: "Take PTO 🎯" },
      { date: "2027-01-01", dayName: "Fri", dayNum: "01", type: "holiday", label: "New Year" },
      { date: "2027-01-02", dayName: "Sat", dayNum: "02", type: "weekend", label: "Weekend" },
      { date: "2027-01-03", dayName: "Sun", dayNum: "03", type: "weekend", label: "Weekend" }
    ]
  }
];
