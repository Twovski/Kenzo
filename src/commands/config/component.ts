import { ApplyOptions } from '@sapphire/decorators';
import { 
    ApplicationCommandRegistry,  
    Command
} from '@sapphire/framework';
import { bgBlackBright, bgRedBright, bold } from 'colorette';
import { 
    AutocompleteInteraction, 
    Colors, 
    ComponentType, 
    DiscordAPIError, 
    EmbedBuilder, 
    Message, 
    PermissionFlagsBits, 
    PermissionsBitField, 
    TextChannel, 
    TextInputStyle 
} from 'discord.js';
import { DatabaseError } from 'pg';

@ApplyOptions<Command.Options>({
    requiredClientPermissions: [
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.ViewChannel
    ]
})

export class Question extends Command {
    public registerApplicationCommands(registry: ApplicationCommandRegistry){
        registry.registerChatInputCommand(builder => 
            builder
                .setName('component')
                .setDescription('Apartado para crear o eliminar textos')
                .setDefaultMemberPermissions(
                    PermissionsBitField.Flags.ManageChannels | 
                    PermissionsBitField.Flags.EmbedLinks | 
                    PermissionsBitField.Flags.ManageGuild
                )
                .setDMPermission(false)
                .addSubcommand(command => 
                    command
                        .setName('create')
                        .setDescription('Crear un bloque de texto')
                        .addStringOption(option => 
                            option
                                .setName('label')
                                .setDescription('Coloque una etiqueta')
                                .setMinLength(1)
                                .setMaxLength(45)
                                .setRequired(true)
                        )
                        .addIntegerOption(option => 
                            option
                                .setName('style')
                                .setDescription('Ingresa el estilo del texto')
                                .addChoices(
                                    { name: 'SHORT', value: TextInputStyle.Short },
                                    { name: 'PARAGRAPH', value: TextInputStyle.Paragraph }
                                )
                                .setRequired(true)
                        )
                        .addBooleanOption(option => 
                            option
                                .setName('required')
                                .setDescription('Obligar a rellenar la pregunta')
                        )
                        .addStringOption(option => 
                            option
                                .setName('placeholder')    
                                .setDescription('Marcador en la casilla de respuesta')  
                                .setMinLength(1)
                                .setMaxLength(100) 
                        )
                        .addStringOption(option => 
                            option
                                .setName('value')    
                                .setDescription('Rellena en la casilla de respuesta')  
                                .setMinLength(1)
                                .setMaxLength(1000) 
                        )
                        .addIntegerOption(option => 
                            option
                                .setName('min_length')
                                .setDescription('Cantidad minima que debe de escribir')  
                                .setMinValue(0)
                                .setMaxValue(1000)  
                        )
                        .addIntegerOption(option => 
                            option
                                .setName('max_length')
                                .setDescription('Cantidad maxima que debe de escribir')  
                                .setMinValue(1)
                                .setMaxValue(1000)  
                        )
                )
                .addSubcommand(command => 
                    command
                        .setName('delete')
                        .setDescription('Eliminar el bloque de texto')
                        .addIntegerOption(option => 
                            option
                                .setName('label')
                                .setDescription('Coloque la etiqueta')
                                .setRequired(true)
                                .setMinValue(1)
                                .setAutocomplete(true)
                        )
                )
        );
    }

    public chatInputRun(interaction: Command.ChatInputCommandInteraction){
        const command = interaction.options.getSubcommand(true);
        if(command === 'create')
            return this.questionCreate(interaction);
        
        this.questionDelete(interaction);
    }

    private async questionCreate(interaction: Command.ChatInputCommandInteraction){
        try{
            await interaction.deferReply({
                ephemeral: true
            });
            await this.container.sql.query(`
                INSERT INTO Components("type", "style", "label", min_length, max_length, required, "value", placeholder, guildID)
                VALUES
                ($1, $2, $3, $4, $5, $6, $7, $8, $9);
            `,[
                ComponentType.TextInput,
                interaction.options.getInteger('style'),
                interaction.options.getString('label'),
                interaction.options.getInteger('min_length'),
                interaction.options.getInteger('max_length') ?? 1000,
                interaction.options.getBoolean('required'),
                interaction.options.getString('value'),
                interaction.options.getString('placeholder'),
                interaction.guildId
            ]);
            
            await interaction.editReply({
                embeds: [ 
                    new EmbedBuilder()
                        .setTitle('Completado ✅')
                        .setDescription(`Componente ${interaction.options.getString('label')} creado.`)
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

    private async questionDelete(interaction:  Command.ChatInputCommandInteraction){
        try{
            await interaction.deferReply({
                ephemeral: true
            });

            const result = await this.container.sql.query(`
                CALL SP_DComponent($1, $2, $3, $4)
            `, [
                interaction.options.getInteger('label'), 
                interaction.guildId,
                null,
                null
            ]);
    
            await interaction.editReply({
                embeds: [ 
                    new EmbedBuilder()
                        .setTitle('Completado ✅')
                        .setDescription(`Componente eliminado exitosamente.`)
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
            const focus = interaction.options.getFocused() + "%";
            const result = await this.container.sql.query(`
                SELECT 
                label as "name",
                componentID as "value"
                FROM Components
                WHERE guildID=$1 AND label LIKE $2
                ORDER BY label ASC
                LIMIT 25
            `, [interaction.guildId, focus]);

            interaction.respond(result.rows);
        }
        catch(e){
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