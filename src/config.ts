import { LogLevel, container } from "@sapphire/framework";
import { Time, Timestamp } from "@sapphire/time-utilities";
import { setup } from "@skyra/env-utilities";
import { ActivityType, ClientOptions, GatewayIntentBits, Partials } from "discord.js";
import { join } from "node:path";
import { rootFolder } from "./libs/utils/constants";
import { LoggerFormatOptions, LoggerStyleBackground, LoggerStyleEffect, LoggerStyleResolvable, LoggerStyleText } from "@sapphire/plugin-logger";
import { bgGreenBright, greenBright, gray, bgGreen, bold, black, bgCyanBright, cyanBright, bgBlackBright, bgYellowBright, bgRedBright, bgYellow, bgRed  } from "colorette";

setup(join(rootFolder, '.env'));
const LOGGER_OPTIONS: LoggerFormatOptions = {
	info: {
        timestamp: {
            color: {
                background: LoggerStyleBackground.BlackBright,
                effects: [LoggerStyleEffect.Bold]
            },
            formatter: (timestamp: string) => bold(bgBlackBright(' ')) + timestamp + bold(bgBlackBright(' '))
        },
        infix: bold(bgCyanBright(' INFORMATION ')) + "〢",
        message: {
            text: LoggerStyleText.CyanBright
        }
    },
    debug: {
        timestamp: {
            color: {
                background: LoggerStyleBackground.BlackBright,
                effects: [LoggerStyleEffect.Bold]
            },
            formatter: (timestamp: string) => bold(bgBlackBright(' ')) + timestamp + bold(bgBlackBright(' '))
        },
        infix: bold(bgGreenBright(' DEBUG ')) + "〢",
        message: {
            text: LoggerStyleText.GreenBright
        }
    },
    error: {
        timestamp: {
            color: {
                background: LoggerStyleBackground.BlackBright,
                effects: [LoggerStyleEffect.Bold]
            },
            formatter: (timestamp: string) => bold(bgBlackBright(' ')) + timestamp + bold(bgBlackBright(' '))
        },
        infix: bold(bgRedBright(' ERROR ')) + "〢",
        message: {
            text: LoggerStyleText.RedBright
        }
    },
    warn: {
        timestamp: {
            color: {
                background: LoggerStyleBackground.BlackBright,
                effects: [LoggerStyleEffect.Bold]
            },
            formatter: (timestamp: string) => bold(bgBlackBright(' ')) + timestamp + bold(bgBlackBright(' '))
        },
        infix: bold(bgYellowBright(' WARN ')) + "〢",
        message: {
            text: LoggerStyleText.YellowBright
        }
    },
    fatal: {
        timestamp: {
            color: {
                background: LoggerStyleBackground.RedBright,
                effects: [LoggerStyleEffect.Bold],


            },
            formatter: (timestamp: string) => bold(bgRedBright(' ')) + timestamp + bold(bgRedBright(' '))
        },
        infix: bold(bgBlackBright(' FATAL ')) + "〢",
        message: {
            text: LoggerStyleText.Black
        }
    },
}

export const DISCORD_OPTIONS: ClientOptions = {
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildPresences
    ],
    logger: {
        level: LogLevel.Info,
        format: LOGGER_OPTIONS
    },
    presence: {
        activities: [{
            name: "Anime",
            type: ActivityType.Watching
        },{
            name: "Minecraft",
            type: ActivityType.Playing
        }],
        status: 'online'
    },
    allowedMentions: { repliedUser: false },
    disableMentionPrefix: true,
    loadMessageCommandListeners: true
}