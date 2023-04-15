import { ApplyOptions } from '@sapphire/decorators';
import { 
    ApplicationCommandRegistry,
    Command
} from '@sapphire/framework';
import { bgBlackBright, bgRedBright, bold } from 'colorette';
import { 
    AutocompleteInteraction, 
    EmbedBuilder, 
    AutocompleteFocusedOption, 
    Colors, 
    PermissionsBitField, 
    Message,
    TextChannel,
    ComponentType,
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

export class Form extends Command {
    public registerApplicationCommands(registry: ApplicationCommandRegistry){
        registry.registerChatInputCommand(builder =>
            builder 
                .setName('form')
                .setDescription('Apartado para crear o eliminar preguntas al formulario')
                .setDefaultMemberPermissions(
                    PermissionsBitField.Flags.ManageChannels | 
                    PermissionsBitField.Flags.EmbedLinks | 
                    PermissionsBitField.Flags.ManageGuild
                )
                .setDMPermission(false)
                .addSubcommandGroup(group => 
                    group
                        .setName('add')
                        .setDescription('Agregar lo necesario al modal')
                        .addSubcommand(command => 
                            command
                                .setName('component')
                                .setDescription('Agregar los componentes al modal')
                                .addIntegerOption(option => 
                                    option
                                        .setName('modal')
                                        .setDescription('Ingresa el modal')
                                        .setMinValue(1000)
                                        .setRequired(true)
                                        .setAutocomplete(true)
                                )
                                .addIntegerOption(option => 
                                    option
                                        .setName('component')
                                        .setDescription('Ingresa el componente')
                                        .setMinValue(1)
                                        .setRequired(true)
                                        .setAutocomplete(true)
                                )    
                        )
                        .addSubcommand(command => 
                            command
                                .setName('role')
                                .setDescription('Agregar los roles al modal')
                                .addIntegerOption(option => 
                                    option
                                        .setName('modal')
                                        .setDescription('Ingresa el modal')
                                        .setMinValue(1000)
                                        .setRequired(true)
                                        .setAutocomplete(true)
                                )
                                .addRoleOption(option => 
                                    option
                                        .setName('role')
                                        .setDescription('Ingresa el role')
                                        .setRequired(true)
                                )
                                .addStringOption(option =>
                                    option
                                        .setName('category')
                                        .setDescription('Elige la catergoria que pertenece este rol')
                                        .setChoices(
                                            {name: 'Give', value: 'G'},
                                            {name: 'Remove', value: 'R'},
                                        )
                                        .setRequired(true)
                                )
                        )
                )
                .addSubcommandGroup(group => 
                    group
                        .setName('delete')
                        .setDescription('Eliminar lo necesario al modal')
                        .addSubcommand(command => 
                            command
                                .setName('component')
                                .setDescription('Eliminar los componentes del modal')
                                .addIntegerOption(option => 
                                    option
                                        .setName('modal')
                                        .setDescription('Ingresa el modal')
                                        .setMinValue(1000)
                                        .setRequired(true)
                                        .setAutocomplete(true)
                                )
                                .addIntegerOption(option => 
                                    option
                                        .setName('component')
                                        .setDescription('Ingresa el componente')
                                        .setMinValue(1)
                                        .setRequired(true)
                                        .setAutocomplete(true)
                                )
                        )
                        .addSubcommand(command => 
                            command
                                .setName('role')
                                .setDescription('Eliminar los roles al modal')
                                .addIntegerOption(option => 
                                    option
                                        .setName('modal')
                                        .setDescription('Ingresa el modal')
                                        .setMinValue(1000)
                                        .setRequired(true)
                                        .setAutocomplete(true)
                                )
                                .addRoleOption(option => 
                                    option
                                        .setName('role')
                                        .setDescription('Ingresa el role')
                                        .setRequired(true)
                                )
                                .addStringOption(option =>
                                    option
                                        .setName('category')
                                        .setDescription('Elige la catergoria que pertenece este rol')
                                        .setChoices(
                                            {name: 'Give', value: 'G'},
                                            {name: 'Remove', value: 'R'},
                                        )
                                        .setRequired(true)
                                )
                        )
                )
        );
    }

    public chatInputRun(interaction: Command.ChatInputCommandInteraction){
        const command = interaction.options.getSubcommandGroup();
        if(command === 'add')
            return this.formAdd(interaction);
    
        this.formDelete(interaction);
    }

    private async formAdd(interaction: Command.ChatInputCommandInteraction){
        const command = interaction.options.getSubcommand();
        if(command === 'component')
            return this.formAddComponent(interaction);
        this.formAddRole(interaction);
    }

    private async formAddRole(interaction: Command.ChatInputCommandInteraction){
        try{
            await interaction.deferReply({
                ephemeral: true
            });

            const role = interaction.options.getRole('role');
            await this.container.sql.query(`
            CALL SP_IModalRole($1, $2, $3, $4)   
            `, [
                interaction.options.getInteger('modal'),
                role.id,
                interaction.options.getString('category'),
                interaction.guildId
            ]);
            
            await interaction.editReply({
                embeds: [ 
                    new EmbedBuilder()
                        .setTitle('Completado ✅')
                        .setDescription(`${role.toString()} agregado en el modal`)
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

    private async formAddComponent(interaction: Command.ChatInputCommandInteraction){
        try{
            await interaction.deferReply({
                ephemeral: true
            });

            await this.container.sql.query(`
                CALL SP_IModalComponent($1, $2, $3)   
            `, [
                interaction.options.getInteger('modal'),
                interaction.options.getInteger('component'),
                interaction.guildId
            ]);
            
            await interaction.editReply({
                embeds: [ 
                    new EmbedBuilder()
                        .setTitle('Completado ✅')
                        .setDescription(`Componente agregado en el modal`)
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

    private async formDelete(interaction: Command.ChatInputCommandInteraction){
        const command = interaction.options.getSubcommand();
        if(command === 'component')
            return this.formDeleteComponent(interaction);
        this.formDeleteRole(interaction)
    }

    private async formDeleteRole(interaction: Command.ChatInputCommandInteraction){
        try{
            await interaction.deferReply({
                ephemeral: true
            });

            const role = interaction.options.getRole('role');
            await this.container.sql.query(`
            CALL SP_DModalRole($1, $2, $3, $4)   
            `, [
                interaction.options.getInteger('modal'),
                role.id,
                interaction.options.getString('category'),
                interaction.guildId
            ]);
            
            await interaction.editReply({
                embeds: [ 
                    new EmbedBuilder()
                        .setTitle('Completado ✅')
                        .setDescription(`${role.toString()} removido del modal`)
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

    private async formDeleteComponent(interaction: Command.ChatInputCommandInteraction){
        try{
            await interaction.deferReply({
                ephemeral: true
            });

            const result = await this.container.sql.query(`
                CALL SP_DModalComponent($1, $2, $3, $4, $5)
            `, [
                interaction.options.getInteger('modal'),
                interaction.options.getInteger('component'),
                interaction.guildId,
                null, 
                null
            ]);

            await interaction.editReply({
                embeds: [ 
                    new EmbedBuilder()
                        .setTitle('Completado ✅')
                        .setDescription(`Componente removido del modal`)
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
        const focus = interaction.options.getFocused(true);
        if(focus.name == 'modal')
            return this.searchModal(interaction, focus);
        this.searchText(interaction, focus);
    }

    private async searchModal(interaction: AutocompleteInteraction, focus: AutocompleteFocusedOption){
        try{
            const result = await this.container.sql.query(`
                SELECT 
                title as "name",
                modalID as "value"
                FROM Modals
                WHERE guildID=$1 AND title LIKE $2
                ORDER BY title ASC
                LIMIT 25
            `, [interaction.guildId, focus.value + "%"]);

            interaction.respond(result.rows)
        }catch(e){
            if(e instanceof DiscordAPIError)
                this.container.logger.error(`${bgRedBright(bold(` ${e.code}〡${this.name}〡autocompleteRun `))}〣${e.message} ${bgBlackBright(bold(` ${interaction.guildId} `))}`);
            interaction.respond([]);
        }
    }

    private async searchText(interaction: AutocompleteInteraction, focus: AutocompleteFocusedOption){
        try{
            const result = await this.container.sql.query(`
                SELECT 
                label as "name",
                componentID as "value"
                FROM Components 
                WHERE guildID=$1 AND label LIKE $2
                ORDER BY label ASC
                LIMIT 25
            `, [interaction.guildId, focus.value + "%"]);

            interaction.respond(result.rows);
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