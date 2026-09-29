const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, REST, Routes, SlashCommandBuilder, EmbedBuilder, AttachmentBuilder, PermissionsBitField, ChannelType } = require('discord.js')

const TOKEN = process.env.TOKEN
const CLIENT_ID = process.env.CLIENT_ID
const GUILD_ID = process.env.GUILD_ID
const STAFF_CHANNEL_ID = process.env.STAFF_CHANNEL_ID
const INSCRIPTION_CHANNEL_ID = process.env.INSCRIPTION_CHANNEL_ID
const CHERCHE_EQUIPIER_CHANNEL_ID = process.env.CHERCHE_EQUIPIER_CHANNEL_ID
const EQUIPES_VALIDEES_CHANNEL_ID = process.env.EQUIPES_VALIDEES_CHANNEL_ID
const ESERIES_CATEGORY_ID = process.env.ESERIES_CATEGORY_ID

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
})

const inscriptions = new Map()
const pendingStep1 = new Map()
let saveMessageId = null
let inscriptionsOpen = true

async function saveData() {
  try {
    const channel = await client.channels.fetch(STAFF_CHANNEL_ID)
    const content = 'ESERIES_DATA:' + JSON.stringify({
      inscriptions: Object.fromEntries(inscriptions),
      inscriptionsOpen
    })
    if (saveMessageId) {
      const msg = await channel.messages.fetch(saveMessageId)
      await msg.edit(content)
    } else {
      const msg = await channel.send(content)
      saveMessageId = msg.id
    }
  } catch (e) {
    console.error('Erreur sauvegarde:', e.message)
  }
}

async function loadData() {
  try {
    const channel = await client.channels.fetch(STAFF_CHANNEL_ID)
    const messages = await channel.messages.fetch({ limit: 20 })
    const dataMsg = messages.find(m => m.author.id === client.user.id && m.content.startsWith('ESERIES_DATA:'))
    if (dataMsg) {
      const parsed = JSON.parse(dataMsg.content.replace('ESERIES_DATA:', ''))
      if (parsed.inscriptions) Object.entries(parsed.inscriptions).forEach(([k, v]) => inscriptions.set(k, v))
      inscriptionsOpen = parsed.inscriptionsOpen !== false
      saveMessageId = dataMsg.id
      console.log(`${inscriptions.size} equipes chargees`)
    }
  } catch (e) {
    console.log('Pas de donnees existantes')
  }
}

async function registerCommands() {
  const commands = [
    new SlashCommandBuilder()
      .setName('setup-eseries')
      .setDescription('Poster le message d\'inscription E-Series (admin)')
      .addStringOption(opt => opt.setName('image').setDescription('URL de l\'image a afficher dans le message (optionnel)').setRequired(false)),
    new SlashCommandBuilder().setName('listequipes').setDescription('Voir toutes les equipes inscrites (admin)'),
    new SlashCommandBuilder().setName('exportequipes').setDescription('Exporter les equipes en CSV (admin)'),
    new SlashCommandBuilder().setName('fermerinscriptions').setDescription('Fermer les inscriptions (admin)'),
    new SlashCommandBuilder().setName('ouvrirscriptions').setDescription('Ouvrir les inscriptions (admin)'),
  ].map(c => c.toJSON())

  const rest = new REST({ version: '10' }).setToken(TOKEN)
  await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands })
  console.log('Commandes enregistrees')
}

function buildModal1BS() {
  const modal = new ModalBuilder().setCustomId('modal_bs_1').setTitle('Inscription Brawl Stars - Etape 1/2')
  modal.addComponents(
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('nom_equipe').setLabel('Nom de l\'equipe').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(30)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('pseudo_cap').setLabel('Pseudo Brawl Stars - Capitaine').setStyle(TextInputStyle.Short).setRequired(true)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('tag_cap').setLabel('Tag Brawl Stars - Capitaine').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('Ex: #ABC123')),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('id_t2').setLabel('ID Discord - Titulaire 2').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('Clic droit -> Copier identifiant')),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('id_t3').setLabel('ID Discord - Titulaire 3').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('Clic droit -> Copier identifiant'))
  )
  return modal
}

function buildModal2BS() {
  const modal = new ModalBuilder().setCustomId('modal_bs_2').setTitle('Inscription Brawl Stars - Etape 2/2')
  modal.addComponents(
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('info_t2').setLabel('Pseudo + Tag - Titulaire 2').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('Ex: MonPseudo #ABC123')),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('info_t3').setLabel('Pseudo + Tag - Titulaire 3').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('Ex: MonPseudo #ABC123')),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('id_rempl1').setLabel('ID Discord - Remplacant 1').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('Clic droit -> Copier identifiant')),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('id_rempl2').setLabel('ID Discord - Remplacant 2 (optionnel)').setStyle(TextInputStyle.Short).setRequired(false).setPlaceholder('Laisser vide si absent')),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('id_coach').setLabel('ID Discord - Coach (optionnel)').setStyle(TextInputStyle.Short).setRequired(false).setPlaceholder('Laisser vide si absent'))
  )
  return modal
}

function buildModal1RL() {
  const modal = new ModalBuilder().setCustomId('modal_rl_1').setTitle('Inscription Rocket League - Equipe 2v2')
  modal.addComponents(
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('nom_equipe').setLabel('Nom de l\'equipe').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(30)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('pseudo_cap').setLabel('Pseudo Epic Games - Capitaine').setStyle(TextInputStyle.Short).setRequired(true)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('id_t2').setLabel('ID Discord - Coequipier').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('Clic droit -> Copier identifiant')),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('pseudo_t2').setLabel('Pseudo Epic Games - Coequipier').setStyle(TextInputStyle.Short).setRequired(true)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('id_rempl').setLabel('ID Discord - Remplacant (optionnel)').setStyle(TextInputStyle.Short).setRequired(false).setPlaceholder('Laisser vide si absent'))
  )
  return modal
}

client.on('ready', async () => {
  console.log(`Bot connecte : ${client.user.tag}`)
  await registerCommands()
  await loadData()
})

client.on('interactionCreate', async interaction => {

  // SETUP
  if (interaction.isChatInputCommand() && interaction.commandName === 'setup-eseries') {
    const isAdmin = interaction.member.permissions.has('Administrator')
    if (!isAdmin) return interaction.reply({ content: 'Permission refusee.', ephemeral: true })

    const imageUrl = interaction.options.getString('image')
    const channel = await client.channels.fetch(INSCRIPTION_CHANNEL_ID)

    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('inscrit_bs').setLabel('🎮 Inscrire mon equipe - Brawl Stars').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('inscrit_rl').setLabel('🚀 Inscrire mon equipe - Rocket League').setStyle(ButtonStyle.Success)
    )
    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('cherche_bs').setLabel('🔍 Chercher une equipe - Brawl Stars').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('cherche_rl').setLabel('🔍 Chercher une equipe - Rocket League').setStyle(ButtonStyle.Secondary)
    )

    const embed = new EmbedBuilder()
      .setTitle('🏆 SHORTCUT E-SERIES - INSCRIPTIONS')
      .setDescription(
        '**Tu as une equipe ?** Clique sur le bouton correspondant a ton jeu.\n\n' +
        '**Tu es solo ?** Clique sur "Chercher une equipe".\n\n' +
        '**Composition obligatoire :**\n' +
        '**Brawl Stars :** 3 titulaires (1 capitaine) + 1 remplacant obligatoire + 1 remplacant optionnel + 1 coach optionnel\n' +
        '**Rocket League :** 2 joueurs (1 capitaine + 1 coequipier) + 1 remplacant optionnel\n\n' +
        '**Conditions :** Tous les participants doivent etre membres du Discord Shortcut. Une personne ne peut etre inscrite que dans une seule equipe.\n\n' +
        '⚠️ **Tu auras besoin des IDs Discord de tes coequipiers.** Pour les trouver : clic droit sur leur profil -> Copier l\'identifiant.\n\n' +
        '🏆 **500 € de cashprize** pour les equipes gagnantes !\n\n' +
        '📋 L\'inscription se fait en **2 etapes**.'
      )
      .setColor('#00C3FF')
      .setFooter({ text: 'Shortcut E-Series - Les inscriptions sont ouvertes' })

    if (imageUrl) embed.setImage(imageUrl)

    await channel.send({
      embeds: [embed],
      components: [row1, row2]
    })

    await interaction.reply({ content: 'Message poste !', ephemeral: true })
  }

  // BOUTONS INSCRIPTION
  if (interaction.isButton() && interaction.customId === 'inscrit_bs') {
    if (!inscriptionsOpen) return interaction.reply({ content: '❌ Les inscriptions sont fermees.', ephemeral: true })
    return interaction.showModal(buildModal1BS())
  }

  if (interaction.isButton() && interaction.customId === 'inscrit_rl') {
    if (!inscriptionsOpen) return interaction.reply({ content: '❌ Les inscriptions sont fermees.', ephemeral: true })
    return interaction.showModal(buildModal1RL())
  }

  // BOUTONS CHERCHE EQUIPIER
  if (interaction.isButton() && interaction.customId === 'cherche_bs') {
    const modal = new ModalBuilder().setCustomId('modal_cherche_bs').setTitle('Chercher une equipe - Brawl Stars')
    modal.addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('pseudo_bs').setLabel('Ton pseudo Brawl Stars').setStyle(TextInputStyle.Short).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('tag_bs').setLabel('Ton tag Brawl Stars').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('Ex: #ABC123')),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('presentation').setLabel('Presente-toi en quelques mots').setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(200))
    )
    return interaction.showModal(modal)
  }

  if (interaction.isButton() && interaction.customId === 'cherche_rl') {
    const modal = new ModalBuilder().setCustomId('modal_cherche_rl').setTitle('Chercher une equipe - Rocket League')
    modal.addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('pseudo_rl').setLabel('Ton pseudo Epic Games').setStyle(TextInputStyle.Short).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('presentation').setLabel('Presente-toi en quelques mots').setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(200))
    )
    return interaction.showModal(modal)
  }

  // BOUTON ETAPE 2 BS
  if (interaction.isButton() && interaction.customId.startsWith('etape2_bs_')) {
    return interaction.showModal(buildModal2BS())
  }

  // MODAL BS ETAPE 1
  if (interaction.isModalSubmit() && interaction.customId === 'modal_bs_1') {
    await interaction.deferReply({ ephemeral: true })

    try {
      const nomEquipe = interaction.fields.getTextInputValue('nom_equipe')
      const pseudoCap = interaction.fields.getTextInputValue('pseudo_cap')
      const tagCap = interaction.fields.getTextInputValue('tag_cap')
      const idT2 = interaction.fields.getTextInputValue('id_t2').trim()
      const idT3 = interaction.fields.getTextInputValue('id_t3').trim()

      const tempId = `BS_${Date.now()}`
      pendingStep1.set(interaction.user.id, {
        tempId, jeu: 'Brawl Stars', nomEquipe,
        capitaine: { discordId: interaction.user.id, pseudo: pseudoCap, tag: tagCap, role: 'Capitaine' },
        idT2, idT3
      })

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`etape2_bs_${interaction.user.id}`).setLabel('➡️ Continuer - Etape 2/2').setStyle(ButtonStyle.Primary)
      )

      await interaction.editReply({
        content:
          `✅ **Etape 1 enregistree !**\n\n` +
          `**Equipe :** ${nomEquipe}\n` +
          `**Capitaine :** <@${interaction.user.id}> (${pseudoCap} - ${tagCap})\n` +
          `**Titulaire 2 :** <@${idT2}>\n` +
          `**Titulaire 3 :** <@${idT3}>\n\n` +
          `Clique sur le bouton pour continuer l'inscription 👇`,
        components: [row]
      })
    } catch (e) {
      console.error('Erreur modal BS 1:', e.message)
      await interaction.editReply({ content: 'Une erreur s\'est produite. Reessaie.' })
    }
  }

  // MODAL BS ETAPE 2
  if (interaction.isModalSubmit() && interaction.customId === 'modal_bs_2') {
    await interaction.deferReply({ ephemeral: true })

    try {
      const step1 = pendingStep1.get(interaction.user.id)
      if (!step1) return interaction.editReply({ content: '❌ Session expiree. Recommence depuis le debut.' })

      const infoT2 = interaction.fields.getTextInputValue('info_t2').trim()
      const infoT3 = interaction.fields.getTextInputValue('info_t3').trim()
      const idRempl1 = interaction.fields.getTextInputValue('id_rempl1').trim()
      const idRempl2 = interaction.fields.getTextInputValue('id_rempl2').trim()
      const idCoach = interaction.fields.getTextInputValue('id_coach').trim()

      const data = {
        id: step1.tempId,
        jeu: 'Brawl Stars',
        nomEquipe: step1.nomEquipe,
        statut: 'en_attente',
        capitaine: step1.capitaine,
        joueurs: [
          { discordId: step1.idT2, info: infoT2, role: 'Titulaire 2' },
          { discordId: step1.idT3, info: infoT3, role: 'Titulaire 3' },
          { discordId: idRempl1, role: 'Remplacant 1' },
          ...(idRempl2 ? [{ discordId: idRempl2, role: 'Remplacant 2' }] : []),
          ...(idCoach ? [{ discordId: idCoach, role: 'Coach' }] : [])
        ],
        createdAt: new Date().toISOString()
      }

      inscriptions.set(data.id, data)
      pendingStep1.delete(interaction.user.id)
      await saveData()

      const staffChannel = await client.channels.fetch(STAFF_CHANNEL_ID)
      const rowValidation = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`valider_${data.id}`).setLabel('✅ Valider').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`refuser_${data.id}`).setLabel('❌ Refuser').setStyle(ButtonStyle.Danger)
      )

      await staffChannel.send({
        embeds: [new EmbedBuilder()
          .setTitle(`📋 Nouvelle inscription - ${data.nomEquipe} (Brawl Stars)`)
          .setDescription(
            `**Capitaine :** <@${data.capitaine.discordId}> (${data.capitaine.pseudo} - ${data.capitaine.tag})\n` +
            `**Titulaire 2 :** <@${step1.idT2}> (${infoT2})\n` +
            `**Titulaire 3 :** <@${step1.idT3}> (${infoT3})\n` +
            `**Remplacant 1 :** <@${idRempl1}>\n` +
            (idRempl2 ? `**Remplacant 2 :** <@${idRempl2}>\n` : '') +
            (idCoach ? `**Coach :** <@${idCoach}>\n` : '')
          )
          .setColor('#00C3FF')
          .setTimestamp()],
        components: [rowValidation]
      })

      await interaction.editReply({
        content:
          `✅ **Inscription complete envoyee au staff !**\n\n` +
          `**Equipe :** ${data.nomEquipe} - Brawl Stars\n` +
          `**Capitaine :** <@${data.capitaine.discordId}>\n` +
          `**Titulaire 2 :** <@${step1.idT2}>\n` +
          `**Titulaire 3 :** <@${step1.idT3}>\n` +
          `**Remplacant 1 :** <@${idRempl1}>\n` +
          (idRempl2 ? `**Remplacant 2 :** <@${idRempl2}>\n` : '') +
          (idCoach ? `**Coach :** <@${idCoach}>\n` : '') +
          `\nVotre inscription est en attente de validation 🙏`
      })
    } catch (e) {
      console.error('Erreur modal BS 2:', e.message)
      await interaction.editReply({ content: 'Une erreur s\'est produite. Reessaie.' })
    }
  }

  // MODAL RL (etape unique)
  if (interaction.isModalSubmit() && interaction.customId === 'modal_rl_1') {
    await interaction.deferReply({ ephemeral: true })

    try {
      const nomEquipe = interaction.fields.getTextInputValue('nom_equipe')
      const pseudoCap = interaction.fields.getTextInputValue('pseudo_cap')
      const idT2 = interaction.fields.getTextInputValue('id_t2').trim()
      const pseudoT2 = interaction.fields.getTextInputValue('pseudo_t2')
      const idRempl = interaction.fields.getTextInputValue('id_rempl').trim()

      const data = {
        id: `RL_${Date.now()}`,
        jeu: 'Rocket League',
        nomEquipe,
        statut: 'en_attente',
        capitaine: { discordId: interaction.user.id, pseudo: pseudoCap, role: 'Capitaine' },
        joueurs: [
          { discordId: idT2, pseudo: pseudoT2, role: 'Coequipier' },
          ...(idRempl ? [{ discordId: idRempl, role: 'Remplacant' }] : [])
        ],
        createdAt: new Date().toISOString()
      }

      inscriptions.set(data.id, data)
      await saveData()

      const staffChannel = await client.channels.fetch(STAFF_CHANNEL_ID)
      const rowValidation = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`valider_${data.id}`).setLabel('✅ Valider').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`refuser_${data.id}`).setLabel('❌ Refuser').setStyle(ButtonStyle.Danger)
      )

      await staffChannel.send({
        embeds: [new EmbedBuilder()
          .setTitle(`📋 Nouvelle inscription - ${nomEquipe} (Rocket League)`)
          .setDescription(
            `**Capitaine :** <@${interaction.user.id}> (Epic: ${pseudoCap})\n` +
            `**Coequipier :** <@${idT2}> (Epic: ${pseudoT2})\n` +
            (idRempl ? `**Remplacant :** <@${idRempl}>\n` : '')
          )
          .setColor('#FF6B00')
          .setTimestamp()],
        components: [rowValidation]
      })

      await interaction.editReply({
        content:
          `✅ **Inscription envoyee au staff !**\n\n` +
          `**Equipe :** ${nomEquipe} - Rocket League\n` +
          `**Capitaine :** <@${interaction.user.id}> (${pseudoCap})\n` +
          `**Coequipier :** <@${idT2}> (${pseudoT2})\n` +
          (idRempl ? `**Remplacant :** <@${idRempl}>\n` : '') +
          `\nVotre inscription est en attente de validation 🙏`
      })
    } catch (e) {
      console.error('Erreur modal RL:', e.message)
      await interaction.editReply({ content: 'Une erreur s\'est produite. Reessaie.' })
    }
  }

  // MODAL CHERCHE EQUIPIER BS
  if (interaction.isModalSubmit() && interaction.customId === 'modal_cherche_bs') {
    await interaction.deferReply({ ephemeral: true })
    try {
      const pseudoBS = interaction.fields.getTextInputValue('pseudo_bs')
      const tagBS = interaction.fields.getTextInputValue('tag_bs')
      const presentation = interaction.fields.getTextInputValue('presentation')
      const chercheChannel = await client.channels.fetch(CHERCHE_EQUIPIER_CHANNEL_ID)
      await chercheChannel.send({
        embeds: [new EmbedBuilder()
          .setTitle('🔍 Recherche equipe - Brawl Stars')
          .setDescription(`**Joueur :** <@${interaction.user.id}>\n**Pseudo :** ${pseudoBS}\n**Tag :** ${tagBS}\n\n**Presentation :** ${presentation}`)
          .setColor('#FF6B35').setTimestamp()]
      })
      await interaction.editReply({ content: '✅ Ton profil a ete poste dans le canal de recherche d\'equipe !' })
    } catch (e) {
      await interaction.editReply({ content: 'Une erreur s\'est produite. Reessaie.' })
    }
  }

  // MODAL CHERCHE EQUIPIER RL
  if (interaction.isModalSubmit() && interaction.customId === 'modal_cherche_rl') {
    await interaction.deferReply({ ephemeral: true })
    try {
      const pseudoRL = interaction.fields.getTextInputValue('pseudo_rl')
      const presentation = interaction.fields.getTextInputValue('presentation')
      const chercheChannel = await client.channels.fetch(CHERCHE_EQUIPIER_CHANNEL_ID)
      await chercheChannel.send({
        embeds: [new EmbedBuilder()
          .setTitle('🔍 Recherche equipe - Rocket League')
          .setDescription(`**Joueur :** <@${interaction.user.id}>\n**Pseudo Epic Games :** ${pseudoRL}\n\n**Presentation :** ${presentation}`)
          .setColor('#FF6B00').setTimestamp()]
      })
      await interaction.editReply({ content: '✅ Ton profil a ete poste dans le canal de recherche d\'equipe !' })
    } catch (e) {
      await interaction.editReply({ content: 'Une erreur s\'est produite. Reessaie.' })
    }
  }

  // VALIDATION STAFF
  if (interaction.isButton() && interaction.customId.startsWith('valider_')) {
    await interaction.deferUpdate()

    const id = interaction.customId.replace('valider_', '')
    const data = inscriptions.get(id)
    if (!data) {
      await interaction.followUp({ content: 'Inscription introuvable.', ephemeral: true })
      return
    }

    try {
      const guild = await client.guilds.fetch(GUILD_ID)

      // Role specifique a l'equipe
      const colorEquipe = data.jeu === 'Brawl Stars' ? '#00C3FF' : '#FF6B00'
      const roleEquipe = await guild.roles.create({
        name: data.nomEquipe,
        color: colorEquipe,
        reason: `E-Series - Equipe ${data.nomEquipe}`
      })

      // Role global du jeu (Brawl Stars Series ou Rocket League Series)
      const nomRoleGlobal = data.jeu === 'Brawl Stars' ? 'Brawl Stars Series' : 'Rocket League Series'
      let roleGlobal = guild.roles.cache.find(r => r.name === nomRoleGlobal)
      if (!roleGlobal) {
        roleGlobal = await guild.roles.create({
          name: nomRoleGlobal,
          color: colorEquipe,
          reason: `E-Series - Role global ${nomRoleGlobal}`
        })
      }

      const tousLesIds = [
        data.capitaine.discordId,
        ...data.joueurs.map(j => j.discordId)
      ].filter(Boolean)

      for (const memberId of tousLesIds) {
        try {
          const member = await guild.members.fetch(memberId)
          await member.roles.add(roleEquipe)
          await member.roles.add(roleGlobal)
        } catch (e) {
          console.error(`Impossible d'ajouter le role a ${memberId}:`, e.message)
        }
      }

      const category = await client.channels.fetch(ESERIES_CATEGORY_ID)
      const teamChannel = await guild.channels.create({
        name: `chat-${data.nomEquipe.toLowerCase().replace(/\s+/g, '-')}`,
        type: ChannelType.GuildText,
        parent: category,
        permissionOverwrites: [
          { id: guild.roles.everyone, deny: [PermissionsBitField.Flags.ViewChannel] },
          { id: roleEquipe.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
        ]
      })

      await teamChannel.send({
        embeds: [new EmbedBuilder()
          .setTitle(`🏆 Bienvenue dans le chat de l'equipe ${data.nomEquipe} !`)
          .setDescription(
            `**Jeu :** ${data.jeu}\n` +
            `**Membres :** ${tousLesIds.map(id => `<@${id}>`).join(' ')}\n\n` +
            `Bonne chance pour la competition ! 🎮`
          )
          .setColor(data.jeu === 'Brawl Stars' ? '#00C3FF' : '#FF6B00')]
      })

      const equipeChannel = await client.channels.fetch(EQUIPES_VALIDEES_CHANNEL_ID)
      await equipeChannel.send({
        embeds: [new EmbedBuilder()
          .setTitle(`✅ ${data.nomEquipe} - ${data.jeu}`)
          .setDescription(
            `**Capitaine :** <@${data.capitaine.discordId}>\n` +
            data.joueurs.map(j => `**${j.role} :** <@${j.discordId}>${j.pseudo ? ` (${j.pseudo})` : ''}${j.info ? ` (${j.info})` : ''}`).join('\n')
          )
          .setColor('#00C853').setTimestamp()]
      })

      data.statut = 'validee'
      data.roleId = roleEquipe.id
      data.roleGlobalId = roleGlobal.id
      data.channelId = teamChannel.id
      inscriptions.set(id, data)
      await saveData()

      await interaction.message.edit({
        embeds: [new EmbedBuilder().setTitle(`✅ ${data.nomEquipe} validee`).setDescription(`Role equipe, role ${nomRoleGlobal} et canal crees avec succes.`).setColor('#00C853')],
        components: []
      })

    } catch (e) {
      console.error('Erreur validation:', e.message)
      await interaction.followUp({ content: `Erreur lors de la validation : ${e.message}`, ephemeral: true })
    }
  }

  // REFUS STAFF
  if (interaction.isButton() && interaction.customId.startsWith('refuser_')) {
    await interaction.deferUpdate()
    const id = interaction.customId.replace('refuser_', '')
    inscriptions.delete(id)
    await saveData()
    await interaction.message.edit({
      embeds: [new EmbedBuilder().setTitle('❌ Inscription refusee').setColor('#FF0000')],
      components: []
    })
  }

  // COMMANDES ADMIN
  if (interaction.isChatInputCommand()) {
    const isAdmin = interaction.member.permissions.has('Administrator')
    if (!isAdmin) return interaction.reply({ content: 'Permission refusee.', ephemeral: true })

    if (interaction.commandName === 'listequipes') {
      const list = [...inscriptions.values()]
      if (!list.length) return interaction.reply({ content: 'Aucune equipe inscrite.', ephemeral: true })
      const desc = list.map(e => `**${e.nomEquipe}** (${e.jeu}) - ${e.statut} - Cap: <@${e.capitaine.discordId}>`).join('\n')
      await interaction.reply({ embeds: [new EmbedBuilder().setTitle(`Equipes inscrites (${list.length})`).setDescription(desc).setColor('#00C3FF')], ephemeral: true })
    }

    if (interaction.commandName === 'exportequipes') {
      let csv = 'ID,Jeu,Nom Equipe,Statut,Capitaine ID,Capitaine Pseudo,Joueurs\n'
      for (const [id, data] of inscriptions.entries()) {
        const joueurs = data.joueurs?.map(j => `${j.role}:${j.discordId}${j.pseudo ? ':' + j.pseudo : ''}${j.info ? ':' + j.info : ''}`).join('|') || ''
        csv += `${id},${data.jeu},${data.nomEquipe},${data.statut},${data.capitaine.discordId},${data.capitaine.pseudo},"${joueurs}"\n`
      }
      const buffer = Buffer.from(csv, 'utf-8')
      const attachment = new AttachmentBuilder(buffer, { name: 'eseries_equipes.csv' })
      await interaction.reply({ files: [attachment], ephemeral: true })
    }

    if (interaction.commandName === 'fermerinscriptions') {
      inscriptionsOpen = false
      await saveData()
      await interaction.reply({ content: '🔒 Inscriptions fermees.', ephemeral: true })
    }

    if (interaction.commandName === 'ouvrirscriptions') {
      inscriptionsOpen = true
      await saveData()
      await interaction.reply({ content: '🔓 Inscriptions ouvertes.', ephemeral: true })
    }
  }
})

client.login(TOKEN)
