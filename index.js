const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, REST, Routes, SlashCommandBuilder, EmbedBuilder, AttachmentBuilder, PermissionsBitField, ChannelType } = require('discord.js')

const TOKEN = process.env.TOKEN
const CLIENT_ID = process.env.CLIENT_ID
const GUILD_ID = process.env.GUILD_ID
const STAFF_CHANNEL_ID = process.env.STAFF_CHANNEL_ID
const INSCRIPTION_CHANNEL_ID = process.env.INSCRIPTION_CHANNEL_ID
const CHERCHE_EQUIPIER_CHANNEL_ID = process.env.CHERCHE_EQUIPIER_CHANNEL_ID
const EQUIPES_VALIDEES_CHANNEL_ID = process.env.EQUIPES_VALIDEES_CHANNEL_ID
const SAVE_CHANNEL_ID = process.env.SAVE_CHANNEL_ID
const ESERIES_CATEGORY_ID = process.env.ESERIES_CATEGORY_ID

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
})

const inscriptions = new Map()
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
      if (parsed.inscriptions) {
        Object.entries(parsed.inscriptions).forEach(([k, v]) => inscriptions.set(k, v))
      }
      inscriptionsOpen = parsed.inscriptionsOpen !== false
      saveMessageId = dataMsg.id
      console.log(`${inscriptions.size} équipes chargées`)
    }
  } catch (e) {
    console.log('Pas de données existantes')
  }
}

async function registerCommands() {
  const commands = [
    new SlashCommandBuilder()
      .setName('setup-eseries')
      .setDescription('Poster le message d\'inscription E-Series (admin)'),
    new SlashCommandBuilder()
      .setName('listequipes')
      .setDescription('Voir toutes les équipes inscrites (admin)'),
    new SlashCommandBuilder()
      .setName('exportequipes')
      .setDescription('Exporter les équipes en CSV (admin)'),
    new SlashCommandBuilder()
      .setName('fermerinscriptions')
      .setDescription('Fermer les inscriptions (admin)'),
    new SlashCommandBuilder()
      .setName('ouvrirscriptions')
      .setDescription('Ouvrir les inscriptions (admin)'),
  ].map(c => c.toJSON())

  const rest = new REST({ version: '10' }).setToken(TOKEN)
  await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands })
  console.log('Commandes enregistrées')
}

client.on('ready', async () => {
  console.log(`Bot connecté : ${client.user.tag}`)
  await registerCommands()
  await loadData()
})

client.on('interactionCreate', async interaction => {

  // SETUP
  if (interaction.isChatInputCommand() && interaction.commandName === 'setup-eseries') {
    const isAdmin = interaction.member.permissions.has('Administrator')
    if (!isAdmin) return interaction.reply({ content: 'Permission refusée.', ephemeral: true })

    const channel = await client.channels.fetch(INSCRIPTION_CHANNEL_ID)

    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('inscrit_bs')
        .setLabel('🎮 Inscrire mon équipe — Brawl Stars')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('inscrit_mc')
        .setLabel('⛏️ Inscrire mon équipe — Minecraft')
        .setStyle(ButtonStyle.Success)
    )

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('cherche_bs')
        .setLabel('🔍 Chercher une équipe — Brawl Stars')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('cherche_mc')
        .setLabel('🔍 Chercher une équipe — Minecraft')
        .setStyle(ButtonStyle.Secondary)
    )

    await channel.send({
      embeds: [new EmbedBuilder()
        .setTitle('🏆 SHORTCUT E-SERIES — INSCRIPTIONS')
        .setDescription(
          '**Tu as une équipe ?** Clique sur le bouton correspondant à ton jeu pour inscrire ton équipe.\n\n' +
          '**Tu es solo ?** Clique sur "Chercher une équipe" pour être mis en relation avec d\'autres joueurs.\n\n' +
          '**Composition :**\n' +
          '• 3 titulaires dont 1 capitaine (obligatoire)\n' +
          '• 1 remplaçant (optionnel)\n\n' +
          '**Conditions :** Tous les participants doivent être membres du Discord Shortcut. Une personne ne peut être inscrite que dans une seule équipe.\n\n' +
          '⚠️ **Pour inscrire tes coéquipiers, tu auras besoin de leur ID Discord.** Pour le trouver : clic droit sur leur profil → Copier l\'identifiant.'
        )
        .setColor('#00C3FF')
        .setFooter({ text: 'Shortcut E-Series • Les inscriptions sont ouvertes' })],
      components: [row1, row2]
    })

    await interaction.reply({ content: 'Message posté !', ephemeral: true })
  }

  // BOUTON INSCRIPTION BRAWL STARS
  if (interaction.isButton() && interaction.customId === 'inscrit_bs') {
    if (!inscriptionsOpen) return interaction.reply({ content: '❌ Les inscriptions sont fermées.', ephemeral: true })

    const modal = new ModalBuilder()
      .setCustomId('modal_bs')
      .setTitle('Inscription Brawl Stars')

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('nom_equipe').setLabel('Nom de l\'équipe').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(30)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('pseudo_bs_cap').setLabel('Ton pseudo Brawl Stars (Capitaine)').setStyle(TextInputStyle.Short).setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('id_t2').setLabel('ID Discord Titulaire 2 (clic droit → Copier ID)').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('Ex: 123456789012345678')
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('id_t3').setLabel('ID Discord Titulaire 3 (clic droit → Copier ID)').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('Ex: 123456789012345678')
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('id_rempl').setLabel('ID Discord Remplaçant (optionnel)').setStyle(TextInputStyle.Short).setRequired(false).setPlaceholder('Laisser vide si pas de remplaçant')
      )
    )

    await interaction.showModal(modal)
  }

  // BOUTON INSCRIPTION MINECRAFT
  if (interaction.isButton() && interaction.customId === 'inscrit_mc') {
    if (!inscriptionsOpen) return interaction.reply({ content: '❌ Les inscriptions sont fermées.', ephemeral: true })

    const modal = new ModalBuilder()
      .setCustomId('modal_mc')
      .setTitle('Inscription Minecraft Java')

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('nom_equipe').setLabel('Nom de l\'équipe').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(30)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('pseudo_mc_cap').setLabel('Ton pseudo Minecraft Java (Capitaine)').setStyle(TextInputStyle.Short).setRequired(true).setMinLength(3).setMaxLength(16)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('id_t2').setLabel('ID Discord Titulaire 2 (clic droit → Copier ID)').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('Ex: 123456789012345678')
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('id_t3').setLabel('ID Discord Titulaire 3 (clic droit → Copier ID)').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('Ex: 123456789012345678')
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('id_rempl').setLabel('ID Discord Remplaçant (optionnel)').setStyle(TextInputStyle.Short).setRequired(false).setPlaceholder('Laisser vide si pas de remplaçant')
      )
    )

    await interaction.showModal(modal)
  }

  // BOUTON CHERCHE EQUIPIER BRAWL STARS
  if (interaction.isButton() && interaction.customId === 'cherche_bs') {
    const modal = new ModalBuilder()
      .setCustomId('modal_cherche_bs')
      .setTitle('Chercher une équipe — Brawl Stars')

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('pseudo_bs').setLabel('Ton pseudo Brawl Stars').setStyle(TextInputStyle.Short).setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('tag_bs').setLabel('Ton tag Brawl Stars (ex: #ABC123)').setStyle(TextInputStyle.Short).setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('presentation').setLabel('Présente-toi en quelques mots').setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(200)
      )
    )

    await interaction.showModal(modal)
  }

  // BOUTON CHERCHE EQUIPIER MINECRAFT
  if (interaction.isButton() && interaction.customId === 'cherche_mc') {
    const modal = new ModalBuilder()
      .setCustomId('modal_cherche_mc')
      .setTitle('Chercher une équipe — Minecraft')

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('pseudo_mc').setLabel('Ton pseudo Minecraft Java exact').setStyle(TextInputStyle.Short).setRequired(true).setMinLength(3).setMaxLength(16)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('presentation').setLabel('Présente-toi en quelques mots').setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(200)
      )
    )

    await interaction.showModal(modal)
  }

  // MODAL INSCRIPTION BRAWL STARS
  if (interaction.isModalSubmit() && interaction.customId === 'modal_bs') {
    await interaction.deferReply({ ephemeral: true })

    try {
      const nomEquipe = interaction.fields.getTextInputValue('nom_equipe')
      const pseudoBSCap = interaction.fields.getTextInputValue('pseudo_bs_cap')
      const idT2 = interaction.fields.getTextInputValue('id_t2').trim()
      const idT3 = interaction.fields.getTextInputValue('id_t3').trim()
      const idRempl = interaction.fields.getTextInputValue('id_rempl').trim()
      const discordCapId = interaction.user.id

      const id = `BS_${Date.now()}`

      const data = {
        id,
        jeu: 'Brawl Stars',
        nomEquipe,
        statut: 'en_attente',
        capitaine: { discordId: discordCapId, pseudo: pseudoBSCap, role: 'Capitaine' },
        joueurs: [
          { discordId: idT2, role: 'Titulaire 2' },
          { discordId: idT3, role: 'Titulaire 3' },
          ...(idRempl ? [{ discordId: idRempl, role: 'Remplaçant' }] : [])
        ],
        createdAt: new Date().toISOString()
      }

      inscriptions.set(id, data)
      await saveData()

      const staffChannel = await client.channels.fetch(STAFF_CHANNEL_ID)

      const rowValidation = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`valider_${id}`).setLabel('✅ Valider').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`refuser_${id}`).setLabel('❌ Refuser').setStyle(ButtonStyle.Danger)
      )

      await staffChannel.send({
        embeds: [new EmbedBuilder()
          .setTitle(`📋 Nouvelle inscription — ${nomEquipe} (Brawl Stars)`)
          .setDescription(
            `**Capitaine :** <@${discordCapId}> (Brawl Stars: ${pseudoBSCap})\n` +
            `**Titulaire 2 :** <@${idT2}>\n` +
            `**Titulaire 3 :** <@${idT3}>\n` +
            (idRempl ? `**Remplaçant :** <@${idRempl}>\n` : '')
          )
          .setColor('#00C3FF')
          .setTimestamp()],
        components: [rowValidation]
      })

      await interaction.editReply({
        content:
          `✅ **Inscription reçue !**\n\n` +
          `**Équipe :** ${nomEquipe} — Brawl Stars\n` +
          `**Capitaine :** <@${discordCapId}>\n` +
          `**Titulaire 2 :** <@${idT2}>\n` +
          `**Titulaire 3 :** <@${idT3}>\n` +
          (idRempl ? `**Remplaçant :** <@${idRempl}>\n` : '') +
          `\nVotre inscription est en attente de validation par le staff.`
      })
    } catch (e) {
      console.error('Erreur modal BS:', e.message)
      await interaction.editReply({ content: 'Une erreur s\'est produite. Réessaie.' })
    }
  }

  // MODAL INSCRIPTION MINECRAFT
  if (interaction.isModalSubmit() && interaction.customId === 'modal_mc') {
    await interaction.deferReply({ ephemeral: true })

    try {
      const nomEquipe = interaction.fields.getTextInputValue('nom_equipe')
      const pseudoMCCap = interaction.fields.getTextInputValue('pseudo_mc_cap')
      const idT2 = interaction.fields.getTextInputValue('id_t2').trim()
      const idT3 = interaction.fields.getTextInputValue('id_t3').trim()
      const idRempl = interaction.fields.getTextInputValue('id_rempl').trim()
      const discordCapId = interaction.user.id

      const id = `MC_${Date.now()}`

      const data = {
        id,
        jeu: 'Minecraft',
        nomEquipe,
        statut: 'en_attente',
        capitaine: { discordId: discordCapId, pseudo: pseudoMCCap, role: 'Capitaine' },
        joueurs: [
          { discordId: idT2, role: 'Titulaire 2' },
          { discordId: idT3, role: 'Titulaire 3' },
          ...(idRempl ? [{ discordId: idRempl, role: 'Remplaçant' }] : [])
        ],
        createdAt: new Date().toISOString()
      }

      inscriptions.set(id, data)
      await saveData()

      const staffChannel = await client.channels.fetch(STAFF_CHANNEL_ID)

      const rowValidation = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`valider_${id}`).setLabel('✅ Valider').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`refuser_${id}`).setLabel('❌ Refuser').setStyle(ButtonStyle.Danger)
      )

      await staffChannel.send({
        embeds: [new EmbedBuilder()
          .setTitle(`📋 Nouvelle inscription — ${nomEquipe} (Minecraft)`)
          .setDescription(
            `**Capitaine :** <@${discordCapId}> (Minecraft: ${pseudoMCCap})\n` +
            `**Titulaire 2 :** <@${idT2}>\n` +
            `**Titulaire 3 :** <@${idT3}>\n` +
            (idRempl ? `**Remplaçant :** <@${idRempl}>\n` : '')
          )
          .setColor('#5C8A00')
          .setTimestamp()],
        components: [rowValidation]
      })

      await interaction.editReply({
        content:
          `✅ **Inscription reçue !**\n\n` +
          `**Équipe :** ${nomEquipe} — Minecraft\n` +
          `**Capitaine :** <@${discordCapId}>\n` +
          `**Titulaire 2 :** <@${idT2}>\n` +
          `**Titulaire 3 :** <@${idT3}>\n` +
          (idRempl ? `**Remplaçant :** <@${idRempl}>\n` : '') +
          `\nVotre inscription est en attente de validation par le staff.`
      })
    } catch (e) {
      console.error('Erreur modal MC:', e.message)
      await interaction.editReply({ content: 'Une erreur s\'est produite. Réessaie.' })
    }
  }

  // MODAL CHERCHE EQUIPIER BS
  if (interaction.isModalSubmit() && interaction.customId === 'modal_cherche_bs') {
    await interaction.deferReply({ ephemeral: true })

    const pseudoBS = interaction.fields.getTextInputValue('pseudo_bs')
    const tagBS = interaction.fields.getTextInputValue('tag_bs')
    const presentation = interaction.fields.getTextInputValue('presentation')

    const chercheChannel = await client.channels.fetch(CHERCHE_EQUIPIER_CHANNEL_ID)

    await chercheChannel.send({
      embeds: [new EmbedBuilder()
        .setTitle('🔍 Recherche équipe — Brawl Stars')
        .setDescription(
          `**Joueur :** <@${interaction.user.id}>\n` +
          `**Pseudo Brawl Stars :** ${pseudoBS}\n` +
          `**Tag :** ${tagBS}\n\n` +
          `**Présentation :** ${presentation}`
        )
        .setColor('#FF6B35')
        .setTimestamp()]
    })

    await interaction.editReply({ content: '✅ Ton profil a été posté dans le canal de recherche d\'équipe !' })
  }

  // MODAL CHERCHE EQUIPIER MC
  if (interaction.isModalSubmit() && interaction.customId === 'modal_cherche_mc') {
    await interaction.deferReply({ ephemeral: true })

    const pseudoMC = interaction.fields.getTextInputValue('pseudo_mc')
    const presentation = interaction.fields.getTextInputValue('presentation')

    const chercheChannel = await client.channels.fetch(CHERCHE_EQUIPIER_CHANNEL_ID)

    await chercheChannel.send({
      embeds: [new EmbedBuilder()
        .setTitle('🔍 Recherche équipe — Minecraft')
        .setDescription(
          `**Joueur :** <@${interaction.user.id}>\n` +
          `**Pseudo Minecraft Java :** ${pseudoMC}\n\n` +
          `**Présentation :** ${presentation}`
        )
        .setColor('#5C8A00')
        .setTimestamp()]
    })

    await interaction.editReply({ content: '✅ Ton profil a été posté dans le canal de recherche d\'équipe !' })
  }

  // VALIDATION STAFF
  if (interaction.isButton() && interaction.customId.startsWith('valider_')) {
    const id = interaction.customId.replace('valider_', '')
    const data = inscriptions.get(id)
    if (!data) return interaction.reply({ content: 'Inscription introuvable.', ephemeral: true })

    await interaction.deferUpdate()

    try {
      const guild = await client.guilds.fetch(GUILD_ID)

      // Créer le rôle d'équipe
      const role = await guild.roles.create({
        name: data.nomEquipe,
        color: data.jeu === 'Brawl Stars' ? '#00C3FF' : '#5C8A00',
        reason: `E-Series — Équipe ${data.nomEquipe}`
      })

      // Attribuer le rôle à tous les membres
      const tousLesIds = [
        data.capitaine.discordId,
        ...data.joueurs.map(j => j.discordId)
      ].filter(Boolean)

      for (const memberId of tousLesIds) {
        try {
          const member = await guild.members.fetch(memberId)
          await member.roles.add(role)
        } catch (e) {
          console.error(`Impossible d'ajouter le rôle à ${memberId}:`, e.message)
        }
      }

      // Créer le canal d'équipe
      const category = await client.channels.fetch(ESERIES_CATEGORY_ID)

      const teamChannel = await guild.channels.create({
        name: `chat-equipe-${data.nomEquipe.toLowerCase().replace(/\s+/g, '-')}`,
        type: ChannelType.GuildText,
        parent: category,
        permissionOverwrites: [
          {
            id: guild.roles.everyone,
            deny: [PermissionsBitField.Flags.ViewChannel]
          },
          {
            id: role.id,
            allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages]
          }
        ]
      })

      await teamChannel.send({
        embeds: [new EmbedBuilder()
          .setTitle(`🏆 Bienvenue dans le chat de l'équipe ${data.nomEquipe} !`)
          .setDescription(
            `**Jeu :** ${data.jeu}\n` +
            `**Capitaine :** <@${data.capitaine.discordId}>\n` +
            tousLesIds.map(id => `<@${id}>`).join(' ') +
            `\n\nBonne chance pour la compétition !`
          )
          .setColor(data.jeu === 'Brawl Stars' ? '#00C3FF' : '#5C8A00')]
      })

      // Publier dans le canal équipes validées
      const equipeChannel = await client.channels.fetch(EQUIPES_VALIDEES_CHANNEL_ID)
      await equipeChannel.send({
        embeds: [new EmbedBuilder()
          .setTitle(`✅ ${data.nomEquipe} — ${data.jeu}`)
          .setDescription(
            `**Capitaine :** <@${data.capitaine.discordId}>\n` +
            data.joueurs.map(j => `**${j.role} :** <@${j.discordId}>`).join('\n')
          )
          .setColor('#00C853')
          .setTimestamp()]
      })

      data.statut = 'validée'
      data.roleId = role.id
      data.channelId = teamChannel.id
      inscriptions.set(id, data)
      await saveData()

      await interaction.message.edit({
        embeds: [new EmbedBuilder()
          .setTitle(`✅ ${data.nomEquipe} validée`)
          .setDescription(`Rôle et canal créés avec succès.`)
          .setColor('#00C853')],
        components: []
      })

    } catch (e) {
      console.error('Erreur validation:', e.message)
      await interaction.followUp({ content: `Erreur lors de la validation : ${e.message}`, ephemeral: true })
    }
  }

  // REFUS STAFF
  if (interaction.isButton() && interaction.customId.startsWith('refuser_')) {
    const id = interaction.customId.replace('refuser_', '')
    inscriptions.delete(id)
    await saveData()

    await interaction.update({
      embeds: [new EmbedBuilder()
        .setTitle('❌ Inscription refusée')
        .setColor('#FF0000')],
      components: []
    })
  }

  // COMMANDES ADMIN
  if (interaction.isChatInputCommand()) {
    const isAdmin = interaction.member.permissions.has('Administrator')
    if (!isAdmin) return interaction.reply({ content: 'Permission refusée.', ephemeral: true })

    if (interaction.commandName === 'listequipes') {
      const list = [...inscriptions.values()]
      if (!list.length) return interaction.reply({ content: 'Aucune équipe inscrite.', ephemeral: true })

      const desc = list.map(e => `**${e.nomEquipe}** (${e.jeu}) — ${e.statut} — Cap: <@${e.capitaine.discordId}>`).join('\n')
      await interaction.reply({
        embeds: [new EmbedBuilder().setTitle(`Équipes inscrites (${list.length})`).setDescription(desc).setColor('#00C3FF')],
        ephemeral: true
      })
    }

    if (interaction.commandName === 'exportequipes') {
      let csv = 'ID,Jeu,Nom Equipe,Statut,Capitaine ID,Joueurs IDs\n'
      for (const [id, data] of inscriptions.entries()) {
        const joueurs = data.joueurs?.map(j => `${j.role}:${j.discordId}`).join('|') || ''
        csv += `${id},${data.jeu},${data.nomEquipe},${data.statut},${data.capitaine.discordId},"${joueurs}"\n`
      }
      const buffer = Buffer.from(csv, 'utf-8')
      const attachment = new AttachmentBuilder(buffer, { name: 'eseries_equipes.csv' })
      await interaction.reply({ files: [attachment], ephemeral: true })
    }

    if (interaction.commandName === 'fermerinscriptions') {
      inscriptionsOpen = false
      await saveData()
      await interaction.reply({ content: '🔒 Inscriptions fermées.', ephemeral: true })
    }

    if (interaction.commandName === 'ouvrirscriptions') {
      inscriptionsOpen = true
      await saveData()
      await interaction.reply({ content: '🔓 Inscriptions ouvertes.', ephemeral: true })
    }
  }
})

client.login(TOKEN)
