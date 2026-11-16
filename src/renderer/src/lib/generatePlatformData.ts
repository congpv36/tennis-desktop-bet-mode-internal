import {
  GAME_FT_HDP_BetToType,
  GAME_FT_OU_BetToType,
  PlatformType,
  RangeType,
  SET_1ST_GAME_OU_BetToType,
  SET_FT_HDP_BetToType
} from '@shared/common/types'

const generateDetailSetting = () => {
  return {
    GAME_FT_HDP_EAT: 0,
    GAME_FT_HDP_PK: 0,
    GAME_FT_HDP_PUT: 0,
    GAME_FT_OVER: 0,
    GAME_FT_UNDER: 0,
    SET_1ST_GAME_OVER: 0,

    SET_1ST_GAME_UNDER: 0,
    SET_FT_HDP_EAT: 0,
    SET_FT_HDP_PK: 0,
    SET_FT_HDP_PUT: 0,
    generalSetting: 'BetAll'
  }
}

export const generateBetTo = (type: string) => {
  const lengths = {
    GAME_FT_HDP: 73,
    GAME_FT_OU: 261,

    SET_1ST_GAME_OU: 53,
    SET_FT_HDP: 11
  }

  return {
    betAll: 1,
    selectAll: 0,
    ...Object.fromEntries(
      Array.from({ length: lengths[type] ?? 11 }, (_, i) => [
        `hdp_${(i * 0.25).toString().replace('.', '_')}`,
        0
      ])
    )
  }
}
const generateGameRange = () => {
  return {
    betAll: 1,
    checkOdd: 0,
    early: 1,
    oddFrom: '0.70',
    oddTo: '-0.01',
    running: 1,
    today: 1
  } as RangeType
}

export function generatePlatformData(platform: PlatformType) {
  return {
    id: platform.id,
    name: platform.name,

    checkOdd: 0,
    oddFrom: '0.01',
    oddTo: '-0.01',
    betOpposite: 0,
    bet: 1,
    contra: 1,

    amountRounderSetting: {
      rounder: 0,
      roundType: 'auto',
      roundValue: '2'
    },
    ...generateDetailSetting(),

    GAME_FT_HDP_EAT_Detail: {
      betTo: generateBetTo('GAME_FT_HDP') as GAME_FT_HDP_BetToType,
      range: generateGameRange()
    },

    GAME_FT_HDP_PK_Detail: {
      range: generateGameRange()
    },

    GAME_FT_HDP_PUT_Detail: {
      betTo: generateBetTo('GAME_FT_HDP') as GAME_FT_HDP_BetToType,
      range: generateGameRange()
    },

    GAME_FT_OVER_Detail: {
      betTo: generateBetTo('GAME_FT_OU') as GAME_FT_OU_BetToType,
      range: generateGameRange()
    },

    GAME_FT_UNDER_Detail: {
      betTo: generateBetTo('GAME_FT_OU') as GAME_FT_OU_BetToType,
      range: generateGameRange()
    },

    SET_1ST_GAME_OVER_Detail: {
      betTo: generateBetTo('SET_1ST_GAME_OU') as SET_1ST_GAME_OU_BetToType,
      range: generateGameRange()
    },

    SET_1ST_GAME_UNDER_Detail: {
      betTo: generateBetTo('SET_1ST_GAME_OU') as SET_1ST_GAME_OU_BetToType,
      range: generateGameRange()
    },

    SET_FT_HDP_EAT_Detail: {
      betTo: generateBetTo('SET_FT_HDP') as SET_FT_HDP_BetToType,
      range: generateGameRange()
    },

    SET_FT_HDP_PK_Detail: {
      range: generateGameRange()
    },

    SET_FT_HDP_PUT_Detail: {
      betTo: generateBetTo('SET_FT_HDP') as SET_FT_HDP_BetToType,
      range: generateGameRange()
    }
  }
}

export function generateTargetAccountData() {
  return {
    ...generateDetailSetting(),

    GAME_FT_HDP_EAT_Detail: {
      betTo: generateBetTo('GAME_FT_HDP'),
      range: generateGameRange()
    },

    GAME_FT_HDP_PK_Detail: {
      range: generateGameRange()
    },

    GAME_FT_HDP_PUT_Detail: {
      betTo: generateBetTo('GAME_FT_HDP'),
      range: generateGameRange()
    },

    GAME_FT_OVER_Detail: {
      betTo: generateBetTo('GAME_FT_OU'),
      range: generateGameRange()
    },

    GAME_FT_UNDER_Detail: {
      betTo: generateBetTo('GAME_FT_OU'),
      range: generateGameRange()
    },

    SET_1ST_GAME_OVER_Detail: {
      betTo: generateBetTo('SET_1ST_GAME_OU'),
      range: generateGameRange()
    },

    SET_1ST_GAME_UNDER_Detail: {
      betTo: generateBetTo('SET_1ST_GAME_OU'),
      range: generateGameRange()
    },

    SET_FT_HDP_EAT_Detail: {
      betTo: generateBetTo('SET_FT_HDP'),
      range: generateGameRange()
    },

    SET_FT_HDP_PK_Detail: {
      range: generateGameRange()
    },

    SET_FT_HDP_PUT_Detail: {
      betTo: generateBetTo('SET_FT_HDP'),
      range: generateGameRange()
    }
  }
}
