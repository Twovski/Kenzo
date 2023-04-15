import { ApplyOptions } from '@sapphire/decorators';
import { ApplicationCommandRegistry, Command } from '@sapphire/framework';
import { bgBlackBright, bgRedBright, bold } from 'colorette';
import { 
    AutocompleteInteraction, 
    EmbedBuilder, 
    PermissionsBitField, 
    Colors, 
    TextChannel, 
    Message, 
    ComponentType, 
    codeBlock,
    DiscordAPIError,
    PermissionFlagsBits
} from 'discord.js';
import { DatabaseError } from 'pg';

@ApplyOptions<Command.Options>({
    requiredClientPermissions: [
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.ViewChannel
    ]
})

export class Forms extends Command {
    public registerApplicationCommands(registry: ApplicationCommandRegistry){
        registry.registerChatInputCommand(builder => 
            builder
                .setName('modal')    
                .setDescription('Apartado para crear o eliminar los modal')
                .setDefaultMemberPermissions(
                    PermissionsBitField.Flags.ManageChannels | 
                    PermissionsBitField.Flags.EmbedLinks | 
                    PermissionsBitField.Flags.ManageGuild
                )
                .setDMPermission(false)
                .addSubcommand(command => 
                    command
                        .setName('create')
                        .setDescription('Crear un modal')
                        .addStringOption(option => 
                            option
                                .setName('title')
                                .setDescription('Ingresa el titulo del modal')
                                .setMinLength(1)
                                .setMaxLength(45)
                                .setRequired(true)
                        )
                )
                .addSubcommand(command => 
                    command
                        .setName('delete')
                        .setDescription('Eliminar un modal')
                        .addIntegerOption(option => 
                            option
                                .setName('title')
                                .setDescription('Ingrese el titulo del modal')
                                .setAutocomplete(true)
                                .setMinValue(1000)
                                .setRequired(true)
                        )
                )
        );
    }

    public chatInputRun(interaction: Command.ChatInputCommandInteraction){
        const command = interaction.options.getSubcommand(true);
        if(command === 'create')
            return this.modalCreate(interaction);
        
        this.modalDelete(interaction);
    }

    private async modalCreate(interaction: Command.ChatInputCommandInteraction){
        try{
            await interaction.deferReply({
                ephemeral: true
            });
            const title = interaction.options.getString('title');
            await this.container.sql.query(`
                INSERT INTO Modals(title, guildID)
                VALUES
                ($1, $2)
            `, [interaction.options.getString('title'), interaction.guildId]);

            await interaction.editReply({
                embeds: [ 
                    new EmbedBuilder()
                        .setTitle('Completado ✅')
                        .setDescription(`Modal - ${title} creado.`)
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

    private async modalDelete(interaction:  Command.ChatInputCommandInteraction){
        try{
            await interaction.deferReply({
                ephemeral: true
            });
            
            const result = await this.container.sql.query(`
                CALL SP_DModal($1, $2, $3, $4)
            `, [
                interaction.options.getInteger('title'), 
                interaction.guildId, 
                null, 
                null
            ]);
    
            await interaction.editReply({
                embeds: [ 
                    new EmbedBuilder()
                        .setTitle('Completado ✅')
                        .setDescription(`Modal eliminado exitosamente.`)
                        .setColor(Colors.Green)
                ]
            });

            const channelsID = result.rows[0].idchannels as string[]
            const messagesID = result.rows[0].idmessages as string[]
            if(!channelsID)
                return;
                            
            messagesID.forEach(async (messageID, index) => {
                const channel = await interaction.client.channels.fetch(channelsID[index]) as TextChannel;
                const message = await channel.messages.fetch(messageID)
                await message.edit({
                    components: await this.getComponents(message)
                });
            });
        }catch(e){
            if(e instanceof DatabaseError)
                return await interaction.editReply({
                    content: e.message
                });

            await interaction.editReply({
                embeds: [ 
                    new EmbedBuilder()
                        .setTitle('📛 Error')
                        .setDescription('Avisa al creador para que me pueda arreglar!')
                        .setFields({
                            name: 'Mensaje',
                            value: codeBlock(e.toString())
                        })
                        .setColor(Colors.Red)
                ]
            });
        }
    }

    public async autocompleteRun(interaction: AutocompleteInteraction){
        try{
            const focus = interaction.options.getFocused() + "%";
            const result = await this.container.sql.query(`
                SELECT 
                title as "name",
                modalID as "value"
                FROM Modals
                WHERE guildID=$1 AND title LIKE $2
                ORDER BY title ASC
                LIMIT 25
            `, [interaction.guildId, focus]);

            interaction.respond(result.rows)
        }catch(e){
            if(e instanceof DiscordAPIError)
                this.container.logger.error(`${bgRedBright(bold(` ${e.code}〡${this.name}〡autocompleteRun `))}〣${e.message} ${bgBlackBright(bold(` ${interaction.guildId} `))}`);
            interaction.respond([]);
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
