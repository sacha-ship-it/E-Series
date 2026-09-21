const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, REST, Routes, SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js')

const TOKEN = process.env.TOKEN
const CLIENT_ID = process.env.CLIENT_ID
const GUILD_ID = process.env.GUILD_ID
const STAFF_CHANNEL_ID = process.env.STAFF_CHANNEL_ID
const INSCRIPTION_CHANNEL_ID = process.env.INSCRIPTION_CHANNEL_ID
const CHERCHE_EQUIPIER_CHANNEL_ID = process.env.CHERCHE_EQUIPIER_CHANNEL_ID
const EQUIPES_VALIDEES_CHANNEL_ID = process.env.EQUIPES_VALIDEES_CHANNEL_ID
const SAVE_CHANNEL_ID = process.env.SAVE_CHANNEL_ID

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
})

const inscriptions = new Map()
const pendingRegistrations = new Map()
let saveMessageId = null
let inscriptionsOpen = true

async function saveData() {
  try {
    const channel = await client.channels.fetch(SAVE_CHANNEL_ID)
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
    const channel = await client.channels.fetch(SAVE_CHANNEL_ID)
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
          '**Composition obligatoire :**\n' +
          '• 3 titulaires dont 1 capitaine\n' +
          '• 1 remplaçant obligatoire\n' +
          '• 1 remplaçant optionnel\n' +
          '• 1 coach optionnel\n\n' +
          '**Conditions :** Tous les participants doivent être membres du Discord Shortcut. Une personne ne peut être inscrite que dans une seule équipe.'
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
      .setCustomId('modal_bs_equipe')
      .setTitle('Inscription Brawl Stars — Équipe')

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('nom_equipe').setLabel('Nom de l\'équipe').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(30)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('pseudo_bs_cap').setLabel('Pseudo Brawl Stars — Capitaine').setStyle(TextInputStyle.Short).setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('tag_bs_cap').setLabel('Tag Brawl Stars — Capitaine (ex: #ABC123)').setStyle(TextInputStyle.Short).setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('pseudo_bs_t2').setLabel('Pseudo Brawl Stars — Titulaire 2').setStyle(TextInputStyle.Short).setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('tag_bs_t2').setLabel('Tag Brawl Stars — Titulaire 2 (ex: #ABC123)').setStyle(TextInputStyle.Short).setRequired(true)
      )
    )

    await interaction.showModal(modal)
  }

  // BOUTON INSCRIPTION MINECRAFT
  if (interaction.isButton() && interaction.customId === 'inscrit_mc') {
    if (!inscriptionsOpen) return interaction.reply({ content: '❌ Les inscriptions sont fermées.', ephemeral: true })

    const modal = new ModalBuilder()
      .setCustomId('modal_mc_equipe')
      .setTitle('Inscription Minecraft — Équipe')

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('nom_equipe').setLabel('Nom de l\'équipe').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(30)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('pseudo_mc_cap').setLabel('Pseudo Minecraft Java — Capitaine').setStyle(TextInputStyle.Short).setRequired(true).setMinLength(3).setMaxLength(16)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('pseudo_mc_t2').setLabel('Pseudo Minecraft Java — Titulaire 2').setStyle(TextInputStyle.Short).setRequired(true).setMinLength(3).setMaxLength(16)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('pseudo_mc_t3').setLabel('Pseudo Minecraft Java — Titulaire 3').setStyle(TextInputStyle.Short).setRequired(true).setMinLength(3).setMaxLength(16)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('pseudo_mc_rempl').setLabel('Pseudo Minecraft Java — Remplaçant').setStyle(TextInputStyle.Short).setRequired(true).setMinLength(3).setMaxLength(16)
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
  if (interaction.isModalSubmit() && interaction.customId === 'modal_bs_equipe') {
    await interaction.deferReply({ ephemeral: true })

    const nomEquipe = interaction.fields.getTextInputValue('nom_equipe')
    const pseudoBSCap = interaction.fields.getTextInputValue('pseudo_bs_cap')
    const tagBSCap = interaction.fields.getTextInputValue('tag_bs_cap')
    const pseudoBST2 = interaction.fields.getTextInputValue('pseudo_bs_t2')
    const tagBST2 = interaction.fields.getTextInputValue('tag_bs_t2')
    const discordCap = interaction.user.username
    const discordCapId = interaction.user.id

    const id = `BS_${Date.now()}`

    const data = {
      id,
      jeu: 'Brawl Stars',
      nomEquipe,
      statut: 'en_attente',
      capitaine: { discord: discordCap, discordId: discordCapId, pseudo: pseudoBSCap, tag: tagBSCap, role: 'Capitaine' },
      joueurs: [
        { discord: '?', pseudo: pseudoBST2, tag: tagBST2, role: 'Titulaire 2' }
      ],
      createdAt: new Date().toISOString()
    }

    pendingRegistrations.set(discordCapId, data)

    const staffChannel = await client.channels.fetch(STAFF_CHANNEL_ID)

    const rowValidation = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`valider_${id}`).setLabel('✅ Valider').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`refuser_${id}`).setLabel('❌ Refuser').setStyle(ButtonStyle.Danger)
    )

    await staffChannel.send({
      embeds: [new EmbedBuilder()
        .setTitle(`📋 Nouvelle inscription — ${nomEquipe} (Brawl Stars)`)
        .setDescription(
          `**Capitaine :** <@${discordCapId}> (${pseudoBSCap} — ${tagBSCap})\n` +
          `**Titulaire 2 :** ${pseudoBST2} — ${tagBST2}\n\n` +
          `⚠️ Inscription incomplète — le capitaine doit ajouter les infos des joueurs restants.`
        )
        .setColor('#FFA500')
        .setTimestamp()],
      components: [rowValidation]
    })

    await interaction.editReply({
      content:
        `✅ **Étape 1 terminée !** Voici ce qu'on a pour l'instant :\n\n` +
        `**Équipe :** ${nomEquipe}\n` +
        `**Capitaine :** ${pseudoBSCap} (${tagBSCap})\n` +
        `**Titulaire 2 :** ${pseudoBST2} (${tagBST2})\n\n` +
        `Il manque encore :\n` +
        `• Titulaire 3 (pseudo + tag)\n` +
        `• Remplaçant obligatoire (pseudo + tag)\n\n` +
        `Contacte le staff pour compléter ton inscription ou ouvre un ticket.`
    })
  }

  // MODAL INSCRIPTION MINECRAFT
  if (interaction.isModalSubmit() && interaction.customId === 'modal_mc_equipe') {
    await interaction.deferReply({ ephemeral: true })

    const nomEquipe = interaction.fields.getTextInputValue('nom_equipe')
    const pseudoMCCap = interaction.fields.getTextInputValue('pseudo_mc_cap')
    const pseudoMCT2 = interaction.fields.getTextInputValue('pseudo_mc_t2')
    const pseudoMCT3 = interaction.fields.getTextInputValue('pseudo_mc_t3')
    const pseudoMCRempl = interaction.fields.getTextInputValue('pseudo_mc_rempl')
    const discordCap = interaction.user.username
    const discordCapId = interaction.user.id

    const id = `MC_${Date.now()}`

    const data = {
      id,
      jeu: 'Minecraft',
      nomEquipe,
      statut: 'en_attente',
      capitaine: { discord: discordCap, discordId: discordCapId, pseudo: pseudoMCCap, role: 'Capitaine' },
      joueurs: [
        { pseudo: pseudoMCT2, role: 'Titulaire 2' },
        { pseudo: pseudoMCT3, role: 'Titulaire 3' },
        { pseudo: pseudoMCRempl, role: 'Remplaçant' }
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
          `**Capitaine :** <@${discordCapId}> (${pseudoMCCap})\n` +
          `**Titulaire 2 :** ${pseudoMCT2}\n` +
          `**Titulaire 3 :** ${pseudoMCT3}\n` +
          `**Remplaçant :** ${pseudoMCRempl}`
        )
        .setColor('#00C3FF')
        .setTimestamp()],
      components: [rowValidation]
    })

    await interaction.editReply({
      content:
        `✅ **Inscription reçue !**\n\n` +
        `**Équipe :** ${nomEquipe} — Minecraft\n` +
        `**Capitaine :** ${pseudoMCCap}\n` +
        `**Titulaire 2 :** ${pseudoMCT2}\n` +
        `**Titulaire 3 :** ${pseudoMCT3}\n` +
        `**Remplaçant :** ${pseudoMCRempl}\n\n` +
        `Votre inscription est en cours de validation par le staff. Vous serez notifiés dès qu'elle est confirmée.`
    })
  }

  // MODAL CHERCHE EQUIPIER BRAWL STARS
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

    await interaction.editReply({ content: '✅ Ton profil a été posté dans le canal de recherche d\'équipe ! Les équipes qui cherchent un joueur pourront te contacter.' })
  }

  // MODAL CHERCHE EQUIPIER MINECRAFT
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

    await interaction.editReply({ content: '✅ Ton profil a été posté dans le canal de recherche d\'équipe ! Les équipes qui cherchent un joueur pourront te contacter.' })
  }

  // BOUTONS VALIDATION STAFF
  if (interaction.isButton() && interaction.customId.startsWith('valider_')) {
    const id = interaction.customId.replace('valider_', '')
    const data = inscriptions.get(id) || pendingRegistrations.get(id)

    if (!data) return interaction.reply({ content: 'Inscription introuvable.', ephemeral: true })

    data.statut = 'validée'
    inscriptions.set(id, data)
    pendingRegistrations.delete(data.capitaine?.discordId)
    await saveData()

    const equipeChannel = await client.channels.fetch(EQUIPES_VALIDEES_CHANNEL_ID)

    const joueursDesc = data.joueurs?.map(j => `• ${j.role} : ${j.pseudo}${j.tag ? ` (${j.tag})` : ''}`).join('\n') || ''

    await equipeChannel.send({
      embeds: [new EmbedBuilder()
        .setTitle(`✅ ${data.nomEquipe} — ${data.jeu}`)
        .setDescription(
          `**Capitaine :** <@${data.capitaine.discordId}> (${data.capitaine.pseudo}${data.capitaine.tag ? ` — ${data.capitaine.tag}` : ''})\n` +
          joueursDesc
        )
        .setColor('#00C853')
        .setTimestamp()]
    })

    await interaction.update({
      embeds: [new EmbedBuilder()
        .setTitle(`✅ ${data.nomEquipe} validée`)
        .setColor('#00C853')],
      components: []
    })
  }

  if (interaction.isButton() && interaction.customId.startsWith('refuser_')) {
    const id = interaction.customId.replace('refuser_', '')
    inscriptions.delete(id)
    await saveData()

    await interaction.update({
      embeds: [new EmbedBuilder()
        .setTitle(`❌ Inscription refusée`)
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
      let csv = 'ID,Jeu,Nom Equipe,Statut,Capitaine Discord,Capitaine Pseudo,Joueurs\n'
      for (const [id, data] of inscriptions.entries()) {
        const joueurs = data.joueurs?.map(j => `${j.role}:${j.pseudo}`).join('|') || ''
        csv += `${id},${data.jeu},${data.nomEquipe},${data.statut},${data.capitaine.discord},${data.capitaine.pseudo},"${joueurs}"\n`
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
