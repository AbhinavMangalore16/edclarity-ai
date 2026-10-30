export type PresetCategory = {
  category: string;
  items: { label: string; instructions?: string }[];
};

export const CLARITIES_PRESETS: PresetCategory[] = [
  {
    category: "📚 Mathematics",
    items: [
      { label: "➕ Algebra" },
      { label: "📐 Geometry" },
      { label: "📈 Calculus" },
      { label: "📊 Statistics" },
      { label: "🎲 Probability" },
      { label: "🧮 Linear Algebra" },
      { label: "📉 Differential Equations" }
    ]
  },

  {
    category: "🔬 Science",
    items: [
      { label: "⚛️ Physics" },
      { label: "🧪 Chemistry" },
      { label: "🧬 Biology" },
      { label: "🌍 Earth Science" },
      { label: "🚀 Space Exploration" },
      { label: "🌱 Environmental Science" }
    ]
  },

  {
    category: "💻 Computer Science & AI",
    items: [
      { label: "💻 Programming Fundamentals" },
      { label: "🌐 Web Development" },
      { label: "⚙️ Data Structures" },
      { label: "🧠 Algorithms" },
      { label: "🗄️ Databases" },
      { label: "☁️ Cloud Computing" },
      { label: "🤖 Artificial Intelligence" },
      { label: "📊 Machine Learning" },
      { label: "🧠 Deep Learning" },
      { label: "💬 Large Language Models" },
      { label: "🔍 Information Retrieval" },
      { label: "🔐 Cybersecurity" },
      { label: "📱 Mobile App Development" },
      { label: "🛠️ DevOps" },
      { label: "🐳 Docker & Kubernetes" },
      { label: "⚡ System Design" }
    ]
  },

  {
    category: "📖 Humanities",
    items: [
      { label: "📜 History" },
      { label: "🌎 Geography" },
      { label: "🏛️ Political Science" },
      { label: "⚖️ Economics" },
      { label: "🧠 Psychology" },
      { label: "📚 Philosophy" },
      { label: "🎨 Art History" }
    ]
  },

  {
    category: "💼 Business & Finance",
    items: [
      { label: "📈 Financial Literacy" },
      { label: "💹 Stock Market Basics" },
      { label: "💰 Investing" },
      { label: "🏦 Banking" },
      { label: "📊 Business Analytics" },
      { label: "📦 Product Management" },
      { label: "🚀 Entrepreneurship" }
    ]
  },

  {
    category: "🗣️ Languages",
    items: [
      { label: "🇬🇧 English Grammar" },
      { label: "✍️ Creative Writing" },
      { label: "📰 Essay Writing" },
      { label: "🗨️ Spoken English" },
      { label: "📖 Vocabulary Builder" }
    ]
  },

  {
    category: "🎯 Competitive Exams",
    items: [
      { label: "📘 JEE Preparation" },
      { label: "🩺 NEET Preparation" },
      { label: "🎓 GATE Preparation" },
      { label: "🏛️ UPSC Preparation" },
      { label: "🏦 Banking Exams" },
      { label: "💼 Placement Preparation" },
      { label: "📝 Aptitude Practice" }
    ]
  },

  {
    category: "🧩 Study Skills",
    items: [
      { label: "📝 Exam Revision" },
      { label: "📖 Concept Explanation" },
      { label: "🎯 Doubt Solving" },
      { label: "📚 Flashcards" },
      { label: "🗂️ Mind Maps" },
      { label: "🧠 Memory Techniques" },
      { label: "⏳ Study Planner" }
    ]
  }
];

export const AGENTS_PRESETS: PresetCategory[] = [
  {
    category: "👨‍🏫 Learning Assistants",
    items: [
      {
        label: "🎓 Personal Tutor",
        instructions: "Teach concepts step-by-step with examples."
      },
      {
        label: "🧒 Explain Like I'm 10",
        instructions: "Explain difficult topics in very simple language."
      },
      {
        label: "📚 Exam Coach",
        instructions: "Focus on important questions, revision, and exam strategy."
      },
      {
        label: "❓ Doubt Solver",
        instructions: "Answer doubts with detailed reasoning."
      },
      {
        label: "📝 Assignment Helper",
        instructions: "Help solve assignments without directly giving answers."
      }
    ]
  },

  {
    category: "💻 Coding",
    items: [
      {
        label: "👨‍💻 Coding Mentor",
        instructions: "Teach coding concepts and guide problem solving."
      },
      {
        label: "🐛 Debugging Expert",
        instructions: "Identify bugs and explain fixes."
      },
      {
        label: "⚡ DSA Coach",
        instructions: "Teach data structures, algorithms, and interview problems."
      },
      {
        label: "🏗️ System Design Mentor",
        instructions: "Teach scalable backend and distributed systems."
      },
      {
        label: "🔍 Code Reviewer",
        instructions: "Review code for correctness, performance, and best practices."
      }
    ]
  },

  {
    category: "🤖 AI & Data Science",
    items: [
      {
        label: "📊 Data Science Tutor",
        instructions: "Teach statistics, ML, and data analysis."
      },
      {
        label: "🤖 Machine Learning Mentor",
        instructions: "Explain ML models with intuition and mathematics."
      },
      {
        label: "🧠 Deep Learning Guide",
        instructions: "Teach neural networks, CNNs, RNNs, and Transformers."
      },
      {
        label: "💬 Prompt Engineering Coach",
        instructions: "Help create effective prompts for LLMs."
      }
    ]
  },

  {
    category: "🎯 Career",
    items: [
      {
        label: "🎤 Mock Interviewer",
        instructions: "Conduct realistic technical interviews."
      },
      {
        label: "📄 Resume Reviewer",
        instructions: "Review resumes like a recruiter."
      },
      {
        label: "💼 Career Mentor",
        instructions: "Guide career decisions and growth."
      },
      {
        label: "🗣️ Communication Coach",
        instructions: "Improve communication and confidence."
      }
    ]
  }
];

export const MEETINGS_PRESETS: PresetCategory[] = [
  {
    category: "📖 Learning Sessions",
    items: [
      { label: "🎯 Mock Interview" },
      { label: "💡 Brainstorming Session" },
      { label: "📚 General Study" },
      { label: "📝 Exam Revision" },
      { label: "❓ Live Doubt Solving" },
      { label: "📖 Chapter Walkthrough" },
      { label: "📊 Quiz Discussion" }
    ]
  },

  {
    category: "💻 Technical",
    items: [
      { label: "🐛 Code Debugging" },
      { label: "⚡ DSA Practice" },
      { label: "🏗️ System Design Discussion" },
      { label: "🤖 AI Project Review" },
      { label: "📈 ML Model Review" },
      { label: "🔍 Research Paper Discussion" }
    ]
  },

  {
    category: "🎓 Academic",
    items: [
      { label: "📄 Assignment Help" },
      { label: "🧮 Problem Solving Session" },
      { label: "🎤 Viva Preparation" },
      { label: "📚 Thesis Discussion" },
      { label: "👨‍🏫 Group Study" }
    ]
  }
];