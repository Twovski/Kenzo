import { 
    ApplicationCommandRegistry,
    Command
} from '@sapphire/framework';
import { AutocompleteInteraction, EmbedBuilder, Colors, PermissionsBitField, ButtonStyle, TextChannel, ComponentType, Message, parseEmoji, DiscordAPIError, PermissionFlagsBits } from 'discord.js';
import { DatabaseError } from 'pg';
import axios from 'axios';
import emojiRegex from 'emoji-regex';
import { bgBlackBright, bgRedBright, bold } from 'colorette';
import { ApplyOptions } from '@sapphire/decorators';

@ApplyOptions<Command.Options>({
    requiredClientPermissions: [
        PermissionFlagsBits.ManageMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.EmbedLinks
    ]
})

export class Setup extends Command {
    public registerApplicationCommands(registry: ApplicationCommandRegistry){
        registry.registerChatInputCommand(builder => 
            builder
                .setName('setup')
                .setDescription('Configuracion para formulario y mensaje')
                .setDefaultMemberPermissions(
                    PermissionsBitField.Flags.ManageGuild |
                    PermissionsBitField.Flags.ManageMessages
                )
                .setDMPermission(false)
                .addSubcommand(option => 
                    option
                        .setName('add')
                        .setDescription('Coloque su formulario en un mensaje')
                        .addStringOption(option =>
                            option
                                .setName('message_id')
                                .setDescription('Ingresa el nombre del titulo')
                                .setRequired(true)
                        )
                        .addIntegerOption(option =>
                            option
                                .setName('form')
                                .setDescription('Ingresa la pregunta')
                                .setRequired(true)
                                .setAutocomplete(true)
                        )
                        .addStringOption(option =>
                            option
                                .setName('label')
                                .setDescription('Texto del boton')
                                .setMinLength(1)
                                .setMaxLength(80)
                                .setRequired(true)
                        )
                        .addIntegerOption(option =>
                            option
                                .setName('style')
                                .setDescription('Texto del boton')
                                .addChoices(
                                    { name: 'PRIMARY', value: ButtonStyle.Primary },
                                    { name: 'SECONDARY', value: ButtonStyle.Secondary },
                                    { name: 'SUCCESS', value: ButtonStyle.Success },
                                    { name: 'DANGER',value: ButtonStyle.Danger }
                                )
                                .setRequired(true)
                        )
                        .addStringOption(option =>
                            option
                                .setName('emoji')
                                .setDescription('Ingresa la pregunta')
                        )
                )
                .addSubcommand(option => 
                    option
                        .setName('remove')
                        .setDescription('Elimina la configuracion del mensaje')
                        .addStringOption(option =>
                            option
                                .setName('message_id')
                                .setDescription('Ingresa el nombre del titulo')
                                .setRequired(true)
                        )
                        .addIntegerOption(option =>
                            option
                                .setName('form')
                                .setDescription('Ingresa la pregunta')
                                .setRequired(true)
                                .setAutocomplete(true)
                        )
                )
        )
    }

    public async chatInputRun(interaction: Command.ChatInputCommandInteraction){
        const command = interaction.options.getSubcommand();
        if(command === 'add')
            return this.addSetup(interaction);

        this.deleteSetup(interaction)
    }

    private async deleteSetup(interaction: Command.ChatInputCommandInteraction){
        try{
            await interaction.deferReply({
                ephemeral: true
            });

            const result = await this.container.sql.query(`
                CALL SP_DMessageModal($1, $2, $3, $4)
            `, [
                interaction.guildId,
                interaction.options.getString('message_id'),
                interaction.options.getInteger('form'),
                null
            ]);

            const channel = await interaction.client.channels.fetch(result.rows[0].idchannel) as TextChannel;
            const message = await channel.messages.fetch(interaction.options.getString('message_id'))
            message.edit({
                components: await this.getComponents(message)
            });
            
            await interaction.editReply({
                embeds: [ 
                    new EmbedBuilder()
                        .setTitle('Completado ✅')
                        .setDescription(`Boton eliminado exitosamente`)
                        .setColor(Colors.Green)
                ]
            });
        }catch(e){
            if(e instanceof DatabaseError){
                this.container.logger.error(`${bgRedBright(bold(` ${e.code}〡${this.name} `))}〣${e.message} ${bgBlackBright(bold(` ${interaction.guildId} `))}`);
                return await interaction.editReply({
                    content: e.message
                });
            }
            else if(e instanceof DiscordAPIError)
                this.container.logger.error(`${bgRedBright(bold(` ${e.code}〡${this.name} `))}〣${e.message} ${bgBlackBright(bold(` ${interaction.guildId} `))}`);
            
            this.container.logger.fatal(`${bgRedBright(bold(` ${this.name} `))}〣${e.toString()} ${bgBlackBright(bold(` ${interaction.guildId} `))}`);
        }
    }

    private async addSetup(interaction: Command.ChatInputCommandInteraction){
        try{
            await interaction.deferReply({
                ephemeral: true
            });

            const result = await this.container.sql.query(`
                CALL SP_IMessageModal($1, $2, $3, $4, $5, $6, $7, $8)
            `, [
                interaction.options.getString('message_id'),
                interaction.options.getInteger('form'),
                interaction.guildId,
                ComponentType.Button,
                interaction.options.getString('label'),
                interaction.options.getInteger('style'),
                await this.getApiEmoji(interaction),
                null
            ]);

            const message = await interaction.client.channels.fetch(result.rows[0].idchannel)
                .then(channel => channel as TextChannel)
                .then(channel => channel.messages.fetch(interaction.options.getString('message_id')));

            await message.edit({
                components: await this.getComponents(message)
            });

            await interaction.editReply({
                embeds: [ 
                    new EmbedBuilder()
                        .setTitle('Completado ✅')
                        .setDescription(`Pregunta agregado en el formulario`)
                        .setColor(Colors.Green)
                ]
            });
        }catch(e){
            if(e instanceof DatabaseError){
                this.container.logger.error(`${bgRedBright(bold(` ${e.code}〡${this.name} `))}〣${e.message} ${bgBlackBright(bold(` ${interaction.guildId} `))}`);
                return await interaction.editReply({
                    content: e.message
                });
            }
            else if(e instanceof DiscordAPIError)
                this.container.logger.error(`${bgRedBright(bold(` ${e.code}〡${this.name} `))}〣${e.message} ${bgBlackBright(bold(` ${interaction.guildId} `))}`);
            
            this.container.logger.fatal(`${bgRedBright(bold(` ${this.name} `))}〣${e.toString()} ${bgBlackBright(bold(` ${interaction.guildId} `))}`);
        }
    }

    public async autocompleteRun(interaction: AutocompleteInteraction){
        try{
            const focus = "%" + interaction.options.getFocused() + "%";
            const result = await this.container.sql.query(`
                SELECT
                title as "name",
                modalID as "value"
                FROM Modals
                WHERE guildID=$1 AND title LIKE $2
                ORDER BY title ASC
                LIMIT 25
            `, [interaction.guildId, "%" + focus + "%"]);
    
            interaction.respond(result.rows)
        }catch(e){
            if(e instanceof DiscordAPIError)
                this.container.logger.error(`${bgRedBright(bold(` ${e.code}〡${this.name}〡autocompleteRun `))}〣${e.message} ${bgBlackBright(bold(` ${interaction.guildId} `))}`);
            interaction.respond([]);
        }
    }

    private async getApiEmoji(interaction: Command.ChatInputCommandInteraction){
        const value = interaction.options.getString('emoji');
        if(!value)
            return null;

        const emoji = parseEmoji(value);
        try{
            await axios.get(`https://cdn.discordapp.com/emojis/${emoji.id}.${emoji.animated ? "gif ": "png"}`);
            return emoji;
        }catch(e){
            if(!emoji.name.matchAll(emojiRegex()).next().value)
                return null;
            
            return emoji;
        }
    }

    private async getComponents(message: Message<true>){
        const components = [];
        const result = await this.container.sql.query(`
            SELECT 
            json_strip_nulls(json_build_object(
                'type', MM.type, 
                'custom_id', MM.modalID::TEXT,
                'label', MM.label,
                'style', MM.style,
                'emoji', MM.emoji
            )) AS components
            FROM MessageModals MM
            INNER JOIN Messages M
                ON M.messageID = MM.messageID
            WHERE MM.messageID=$1 AND M.guildID=$2
        `, [message.id, message.guildId]);

        if(!result.rowCount)
            return [];

        components.push({
            type: ComponentType.ActionRow,
            components: result.rows.map(object => object.components)
        });
        
        return components;
    }
}
