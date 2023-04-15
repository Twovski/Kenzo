import { ApplyOptions } from '@sapphire/decorators';
import { setTimeout } from "timers/promises";
import { Events, Listener } from '@sapphire/framework';
import { 
    ButtonInteraction, 
    CacheType, 
    Colors,
    DiscordAPIError,
    EmbedBuilder, 
    Interaction, 
    ModalSubmitInteraction, 
    TextChannel
} from 'discord.js';
import { DatabaseError, QueryResult } from 'pg';
import { bgBlackBright, bgRedBright, bold } from 'colorette';

@ApplyOptions<Listener.Options>({
    event: Events.InteractionCreate
})

export class MessageDeleteListener extends Listener<typeof Events.InteractionCreate>{
    public async run(interaction: Interaction<CacheType>) {
        if(interaction.isButton()){
            try{
                await interaction.showModal(
                    await this.getComponents(interaction)
                );
            }
            catch(e){
                if(e instanceof DiscordAPIError)
                    return this.container.logger.error(`${bgRedBright(bold(` ${e.code}〡${this.name} `))}〣${e.message} ${bgBlackBright(bold(` ${interaction.guildId} `))}`);
                else if(e instanceof DatabaseError)
                    return this.container.logger.error(`${bgRedBright(bold(` ${e.code}〡${this.name} `))}〣${e.message} ${bgBlackBright(bold(` ${interaction.guildId} `))}`);
                
                return this.container.logger.fatal(`${bgRedBright(bold(` ${this.name} `))}〣${e.toString()} ${bgBlackBright(bold(` ${interaction.guildId} `))}`);
            }
        }
        
        
        if(interaction.isModalSubmit()){
            if(interaction.customId === 'EditMessage')
                return this.editMessage(interaction);
                
            await this.modalSubmit(interaction);
            
        }
    }

    private async editMessage(interaction: ModalSubmitInteraction<CacheType>){
        try{
            await interaction.deferReply({
                ephemeral: true
            });

            const text = interaction.fields.fields.at(0);
            const [ channel_id, message_id ] = text.customId.split(':');
            const channel = await interaction.client.channels.fetch(channel_id) as TextChannel;
            const message = await channel.messages.fetch(message_id);

            if(message.content)
                await message.edit({
                    content: text.value
                });
            else 
                await message.edit({
                    embeds: [
                        new EmbedBuilder(JSON.parse(text.value))
                    ]
                });
            
            
            await interaction.editReply({
                embeds: [ 
                    new EmbedBuilder()
                        .setTitle('Completado ✅')
                        .setDescription(`Mensaje editado exitosamente.`)
                        .setColor(Colors.Green)
                ]
            });
        }
        catch(e){
            if(e instanceof DiscordAPIError){
                this.container.logger.error(`${bgRedBright(bold(` ${e.code}〡${this.name} `))}〣${e.message} ${bgBlackBright(bold(` ${interaction.guildId} `))}`);
                return await interaction.editReply({
                    content: "JSON no válido.\nPuede usar el creador de embeds usando el comando **/embed**."
                })
            }

            this.container.logger.error(`${bgRedBright(bold(` ${this.name} `))}〣${e.toString()} ${bgBlackBright(bold(` ${interaction.guildId} `))}`);
            return await interaction.editReply({
                content: "JSON no válido.\nPuede usar el creador de embeds usando el comando **/embed**."
            })
        }
    }

    private async modalSubmit(interaction: ModalSubmitInteraction<CacheType>){
        try{
            await interaction.deferReply({
                ephemeral: true
            });
            
            const result = await Promise.all([
                this.container.sql.query(`
                    SELECT
                    title
                    FROM Modals
                    WHERE guildID = $1 AND modalID =$2;
                `, [interaction.guildId, interaction.customId]),
                this.container.sql.query(`
                    SELECT 
                    C.label as name,
                    JCR.value
                    FROM json_populate_recordset(NULL::json_component_rows, $1) JCR
                    INNER JOIN Components C
                        ON JCR."customId" = C.componentID
                    WHERE C.guildID = $2
                `,[JSON.stringify(interaction.fields.fields.toJSON()), interaction.guildId]),
                this.container.sql.query(`
                    SELECT
                    channelID
                    FROM Guilds
                    WHERE guildID = $1;
                `, [interaction.guildId])
            ])

            let query: QueryResult<any> = result[2]

            if(!query.rows[0].channelid){
                query = await interaction.guild.channels.create({
                    name: 'Canal de respuestas2'
                })
                .then(channel => this.container.sql.query(`
                    UPDATE Guilds
                    SET channelID = $1
                    WHERE guildID = $2
                    RETURNING *
                `, [channel.id, channel.guildId]))
            }
            
            const channel = await interaction.client.channels.fetch(query.rows[0].channelid) as TextChannel;
            await Promise.all([
                channel.send({
                    embeds: [
                        new EmbedBuilder()
                            .setThumbnail(interaction.user.avatarURL({size: 4096}))
                            .setColor('Random')
                            .setTitle(`Respuestas - ${ result[0].rows[0].title }`)
                            .setFields(result[1].rows)
                            .setFooter({text: `${ interaction.user.username } - ${ interaction.user.id }`})
                            .setTimestamp()
                    ]
                }),
                interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle(`Formulario ${ result[0].rows[0].title } Completado! ⭐`)
                            .setDescription('¡Felicidades!, el formulario se ha enviado correctamente.')
                            .setFooter({ text: `Para ${interaction.user.tag}`,  iconURL: interaction.user.avatarURL({ size: 4096 })})
                            .setColor(Colors.Gold)
                    ]
                })
            ]);
        }
        catch(e){
            if(e instanceof DiscordAPIError){
                switch(e.code){
                    case 50013:
                        await interaction.editReply({
                            content: `Necesitas darme permiso de crear canales o ejecutar este comando </channel:1089058872452456498> para definir el canal de respuestas`
                        });
                        break;
                    case 10003:
                        await interaction.editReply({
                            content: `Este canal no existe en este servidor, porfavor defina una con </channel:1089058872452456498>`
                        })
                        break; 
                    default:
                        this.container.logger.error(`${bgRedBright(bold(` ${e.code}〡${this.name} `))}〣${e.message} ${bgBlackBright(bold(` ${interaction.guildId} `))}`);
                        interaction.editReply({
                            content: 'Hubo un problema al analizar el formulario, porfavor vuelva a intentarlo'
                        });
                        break;
                }
            }
            else if(e instanceof DatabaseError)
                this.container.logger.error(`${bgRedBright(bold(` ${e.code}〡${this.name} `))}〣${e.message} ${bgBlackBright(bold(` ${interaction.guildId} `))}`);
            else
                this.container.logger.fatal(`${bgRedBright(bold(` ${this.name} `))}〣${e.toString()} ${bgBlackBright(bold(` ${interaction.guildId} `))}`);
        }
    }

    private async getComponents(interaction: ButtonInteraction<CacheType>){
        
        const result = await Promise.all([
            this.container.sql.query(`
                SELECT
                title
                FROM Modals
                WHERE guildID = $1 AND modalID =$2;
            `, [interaction.guildId, interaction.customId]),
            this.container.sql.query(`
                SELECT
                array_agg(json_strip_nulls(json_build_object(
                    'type', C.type, 
                    'custom_id', C.componentID::TEXT,
                    'style', C.style,
                    'label', C.label,
                    'min_length', C.min_length,
                    'max_length', C.max_length,
                    'required', C.required,
                    'value', C.value,
                    'placeholder', C.placeholder
                )))AS components,
                1 AS type
                FROM Components C 
                INNER JOIN ModalComponents MC
                    ON MC.componentID = C.componentID 
                GROUP BY C.componentID, C.guildID, MC.modalID
                HAVING C.guildID = $1 AND MC.modalID = $2;
            `, [interaction.guildId, interaction.customId])
        ]);
            
        return {
            customId: interaction.customId,
            title: result[0].rows[0].title,
            components: result[1].rows
        };
    }
}