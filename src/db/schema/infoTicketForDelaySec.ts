const infoTicketForDelaySecSchema = `
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        
        platform TEXT,
        company TEXT,

        idLeague INTEGER,
        idEvent INTEGER,
        targetType TEXT,
        type TEXT,
        hdp_point TEXT,

        bet TEXT,
        timestamp TEXT
      `

export default infoTicketForDelaySecSchema
