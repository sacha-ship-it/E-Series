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
      console.log(`${inscriptions.size} équipes chargées`)
    }
  } catch (e) {
    console.log('Pas de données existantes')
  }
}

async function registerCommands() {
  const commands = [
    new SlashCommandBuilder().setName('setup-eseries').setDescription('Poster le message d\'inscription E-Series (admin)'),
    new SlashCommandBuilder().setName('listequipes').setDescription('Voir toutes les équipes inscrites (admin)'),
    new SlashCommandBuilder().setName('exportequipes').setDescription('Exporter les équipes en CSV (admin)'),
    new SlashCommandBuilder().setName('fermerinscriptions').setDescription('Fermer les inscriptions (admin)'),
    new SlashCommandBuilder().setName('ouvrirscriptions').setDescription('Ouvrir les inscriptions (admin)'),
  ].map(c => c.toJSON())

  const rest = new REST({ version: '10' }).setToken(TOKEN)
  await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands })
  console.log('Commandes enregistrées')
}

function buildModal1BS() {
  const modal = new ModalBuilder().setCustomId('modal_bs_1').setTitle('Inscription Brawl Stars — Étape 1/2')
  modal.addComponents(
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('nom_equipe').setLabel('Nom de l\'équipe').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(30)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('pseudo_cap').setLabel('Pseudo Brawl Stars — Capitaine').setStyle(TextInputStyle.Short).setRequired(true)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('tag_cap').setLabel('Tag Brawl Stars — Capitaine').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('Ex: #ABC123')),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('id_t2').setLabel('ID Discord — Titulaire 2').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('Clic droit → Copier identifiant')),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('id_t3').setLabel('ID Discord — Titulaire 3').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('Clic droit → Copier identifiant'))
  )
  return modal
}

function buildModal2BS() {
  const modal = new ModalBuilder().setCustomId('modal_bs_2').setTitle('Inscription Brawl Stars — Étape 2/2')
  modal.addComponents(
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('info_t2').setLabel('Pseudo + Tag — Titulaire 2').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('Ex: MonPseudo #ABC123')),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('info_t3').setLabel('Pseudo + Tag — Titulaire 3').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('Ex: MonPseudo #ABC123')),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('id_rempl1').setLabel('ID Discord — Remplaçant 1').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('Clic droit → Copier identifiant')),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('id_rempl2').setLabel('ID Discord — Remplaçant 2 (optionnel)').setStyle(TextInputStyle.Short).setRequired(false).setPlaceholder('Laisser vide si absent')),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('id_coach').setLabel('ID Discord — Coach (optionnel)').setStyle(TextInputStyle.Short).setRequired(false).setPlaceholder('Laisser vide si absent'))
  )
  return modal
}

function buildModal1MC() {
  const modal = new ModalBuilder().setCustomId('modal_mc_1').setTitle('Inscription Minecraft — Étape 1/2')
  modal.addComponents(
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('nom_equipe').setLabel('Nom de l\'équipe').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(30)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('pseudo_cap').setLabel('Pseudo Minecraft Java — Capitaine').setStyle(TextInputStyle.Short).setRequired(true).setMinLength(3).setMaxLength(16)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('id_t2').setLabel('ID Discord — Titulaire 2').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('Clic droit → Copier identifiant')),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('id_t3').setLabel('ID Discord — Titulaire 3').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('Clic droit → Copier identifiant')),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('id_rempl1').setLabel('ID Discord — Remplaçant 1').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('Clic droit → Copier identifiant'))
  )
  return modal
}

function buildModal2MC() {
  const modal = new ModalBuilder().setCustomId('modal_mc_2').setTitle('Inscription Minecraft — Étape 2/2')
  modal.addComponents(
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('pseudo_t2').setLabel('Pseudo Minecraft Java — Titulaire 2').setStyle(TextInputStyle.Short).setRequired(true).setMinLength(3).setMaxLength(16)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('pseudo_t3').setLabel('Pseudo Minecraft Java — Titulaire 3').setStyle(TextInputStyle.Short).setRequired(true).setMinLength(3).setMaxLength(16)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('pseudo_rempl1').setLabel('Pseudo Minecraft Java — Remplaçant 1').setStyle(TextInputStyle.Short).setRequired(true).setMinLength(3).setMaxLength(16)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('id_rempl2').setLabel('ID Discord — Remplaçant 2 (optionnel)').setStyle(TextInputStyle.Short).setRequired(false).setPlaceholder('Laisser vide si absent')),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('id_coach').setLabel('ID Discord — Coach (optionnel)').setStyle(TextInputStyle.Short).setRequired(false).setPlaceholder('Laisser vide si absent'))
  )
  return modal
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
      new ButtonBuilder().setCustomId('inscrit_bs').setLabel('🎮 Inscrire mon équipe — Brawl Stars').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('inscrit_mc').setLabel('⛏️ Inscrire mon équipe — Minecraft').setStyle(ButtonStyle.Success)
    )
    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('cherche_bs').setLabel('🔍 Chercher une équipe — Brawl Stars').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('cherche_mc').setLabel('🔍 Chercher une équipe — Minecraft').setStyle(ButtonStyle.Secondary)
    )

    await channel.send({
      embeds: [new EmbedBuilder()
        .setTitle('🏆 SHORTCUT E-SERIES — INSCRIPTIONS')
        .setDescription(
          '**Tu as une équipe ?** Clique sur le bouton correspondant à ton jeu.\n\n' +
          '**Tu es solo ?** Clique sur "Chercher une équipe".\n\n' +
          '**Composition obligatoire :**\n' +
          '• 3 titulaires dont 1 capitaine\n' +
          '• 1 remplaçant obligatoire\n' +
          '• 1 remplaçant optionnel\n' +
          '• 1 coach optionnel\n' +
          '*(entre 4 et 6 personnes par équipe)*\n\n' +
          '**Conditions :** Tous les participants doivent être membres du Discord Shortcut. Une personne ne peut être inscrite que dans une seule équipe.\n\n' +
          '⚠️ **Tu auras besoin des IDs Discord de tes coéquipiers.** Pour les trouver : clic droit sur leur profil → Copier l\'identifiant.\n\n' +
          '📋 L\'inscription se fait en **2 étapes**.'
        )
        .setColor('#00C3FF')
        .setFooter({ text: 'Shortcut E-Series • Les inscriptions sont ouvertes' })],
      components: [row1, row2]
    })

    await interaction.reply({ content: 'Message posté !', ephemeral: true })
  }

  // BOUTONS INSCRIPTION
  if (interaction.isButton() && interaction.customId === 'inscrit_bs') {
    if (!inscriptionsOpen) return interaction.reply({ content: '❌ Les inscriptions sont fermées.', ephemeral: true })
    return interaction.showModal(buildModal1BS())
  }

  if (interaction.isButton() && interaction.customId === 'inscrit_mc') {
    if (!inscriptionsOpen) return interaction.reply({ content: '❌ Les inscriptions sont fermées.', ephemeral: true })
    return interaction.showModal(buildModal1MC())
  }

  // BOUTONS CHERCHE EQUIPIER
  if (interaction.isButton() && interaction.customId === 'cherche_bs') {
    const modal = new ModalBuilder().setCustomId('modal_cherche_bs').setTitle('Chercher une équipe — Brawl Stars')
    modal.addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('pseudo_bs').setLabel('Ton pseudo Brawl Stars').setStyle(TextInputStyle.Short).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('tag_bs').setLabel('Ton tag Brawl Stars').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('Ex: #ABC123')),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('presentation').setLabel('Présente-toi en quelques mots').setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(200))
    )
    return interaction.showModal(modal)
  }

  if (interaction.isButton() && interaction.customId === 'cherche_mc') {
    const modal = new ModalBuilder().setCustomId('modal_cherche_mc').setTitle('Chercher une équipe — Minecraft')
    modal.addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('pseudo_mc').setLabel('Ton pseudo Minecraft Java exact').setStyle(TextInputStyle.Short).setRequired(true).setMinLength(3).setMaxLength(16)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('presentation').setLabel('Présente-toi en quelques mots').setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(200))
    )
    return interaction.showModal(modal)
  }

  // BOUTON ETAPE 2
  if (interaction.isButton() && interaction.customId.startsWith('etape2_bs_')) {
    return interaction.showModal(buildModal2BS())
  }

  if (interaction.isButton() && interaction.customId.startsWith('etape2_mc_')) {
    return interaction.showModal(buildModal2MC())
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
        new ButtonBuilder().setCustomId(`etape2_bs_${interaction.user.id}`).setLabel('➡️ Continuer — Étape 2/2').setStyle(ButtonStyle.Primary)
      )

      await interaction.editReply({
        content:
          `✅ **Étape 1 enregistrée !**\n\n` +
          `**Équipe :** ${nomEquipe}\n` +
          `**Capitaine :** <@${interaction.user.id}> (${pseudoCap} — ${tagCap})\n` +
          `**Titulaire 2 :** <@${idT2}>\n` +
          `**Titulaire 3 :** <@${idT3}>\n\n` +
          `Clique sur le bouton pour continuer l'inscription 👇`,
        components: [row]
      })
    } catch (e) {
      console.error('Erreur modal BS 1:', e.message)
      await interaction.editReply({ content: 'Une erreur s\'est produite. Réessaie.' })
    }
  }

  // MODAL BS ETAPE 2
  if (interaction.isModalSubmit() && interaction.customId === 'modal_bs_2') {
    await interaction.deferReply({ ephemeral: true })

    try {
      const step1 = pendingStep1.get(interaction.user.id)
      if (!step1) return interaction.editReply({ content: '❌ Session expirée. Recommence depuis le début.' })

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
          { discordId: idRempl1, role: 'Remplaçant 1' },
          ...(idRempl2 ? [{ discordId: idRempl2, role: 'Remplaçant 2' }] : []),
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
          .setTitle(`📋 Nouvelle inscription — ${data.nomEquipe} (Brawl Stars)`)
          .setDescription(
            `**Capitaine :** <@${data.capitaine.discordId}> (${data.capitaine.pseudo} — ${data.capitaine.tag})\n` +
            `**Titulaire 2 :** <@${step1.idT2}> (${infoT2})\n` +
            `**Titulaire 3 :** <@${step1.idT3}> (${infoT3})\n` +
            `**Remplaçant 1 :** <@${idRempl1}>\n` +
            (idRempl2 ? `**Remplaçant 2 :** <@${idRempl2}>\n` : '') +
            (idCoach ? `**Coach :** <@${idCoach}>\n` : '')
          )
          .setColor('#00C3FF')
          .setTimestamp()],
        components: [rowValidation]
      })

      await interaction.editReply({
        content:
          `✅ **Inscription complète envoyée au staff !**\n\n` +
          `**Équipe :** ${data.nomEquipe} — Brawl Stars\n` +
          `**Capitaine :** <@${data.capitaine.discordId}>\n` +
          `**Titulaire 2 :** <@${step1.idT2}>\n` +
          `**Titulaire 3 :** <@${step1.idT3}>\n` +
          `**Remplaçant 1 :** <@${idRempl1}>\n` +
          (idRempl2 ? `**Remplaçant 2 :** <@${idRempl2}>\n` : '') +
          (idCoach ? `**Coach :** <@${idCoach}>\n` : '') +
          `\nVotre inscription est en attente de validation 🙏`
      })
    } catch (e) {
      console.error('Erreur modal BS 2:', e.message)
      await interaction.editReply({ content: 'Une erreur s\'est produite. Réessaie.' })
    }
  }

  // MODAL MC ETAPE 1
  if (interaction.isModalSubmit() && interaction.customId === 'modal_mc_1') {
    await interaction.deferReply({ ephemeral: true })

    try {
      const nomEquipe = interaction.fields.getTextInputValue('nom_equipe')
      const pseudoCap = interaction.fields.getTextInputValue('pseudo_cap')
      const idT2 = interaction.fields.getTextInputValue('id_t2').trim()
      const idT3 = interaction.fields.getTextInputValue('id_t3').trim()
      const idRempl1 = interaction.fields.getTextInputValue('id_rempl1').trim()

      const tempId = `MC_${Date.now()}`
      pendingStep1.set(interaction.user.id, {
        tempId, jeu: 'Minecraft', nomEquipe,
        capitaine: { discordId: interaction.user.id, pseudo: pseudoCap, role: 'Capitaine' },
        idT2, idT3, idRempl1
      })

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`etape2_mc_${interaction.user.id}`).setLabel('➡️ Continuer — Étape 2/2').setStyle(ButtonStyle.Success)
      )

      await interaction.editReply({
        content:
          `✅ **Étape 1 enregistrée !**\n\n` +
          `**Équipe :** ${nomEquipe}\n` +
          `**Capitaine :** <@${interaction.user.id}> (${pseudoCap})\n` +
          `**Titulaire 2 :** <@${idT2}>\n` +
          `**Titulaire 3 :** <@${idT3}>\n` +
          `**Remplaçant 1 :** <@${idRempl1}>\n\n` +
          `Clique sur le bouton pour continuer l'inscription 👇`,
        components: [row]
      })
    } catch (e) {
      console.error('Erreur modal MC 1:', e.message)
      await interaction.editReply({ content: 'Une erreur s\'est produite. Réessaie.' })
    }
  }

  // MODAL MC ETAPE 2
  if (interaction.isModalSubmit() && interaction.customId === 'modal_mc_2') {
    await interaction.deferReply({ ephemeral: true })

    try {
      const step1 = pendingStep1.get(interaction.user.id)
      if (!step1) return interaction.editReply({ content: '❌ Session expirée. Recommence depuis le début.' })

      const pseudoT2 = interaction.fields.getTextInputValue('pseudo_t2').trim()
      const pseudoT3 = interaction.fields.getTextInputValue('pseudo_t3').trim()
      const pseudoRempl1 = interaction.fields.getTextInputValue('pseudo_rempl1').trim()
      const idRempl2 = interaction.fields.getTextInputValue('id_rempl2').trim()
      const idCoach = interaction.fields.getTextInputValue('id_coach').trim()

      const mcRegex = /^[a-zA-Z0-9_]{3,16}$/
      if (!mcRegex.test(pseudoT2)) return interaction.editReply({ content: `❌ Pseudo Minecraft invalide pour le Titulaire 2 : **${pseudoT2}**\nUniquement lettres, chiffres et underscores (3-16 caractères).` })
      if (!mcRegex.test(pseudoT3)) return interaction.editReply({ content: `❌ Pseudo Minecraft invalide pour le Titulaire 3 : **${pseudoT3}**\nUniquement lettres, chiffres et underscores (3-16 caractères).` })
      if (!mcRegex.test(pseudoRempl1)) return interaction.editReply({ content: `❌ Pseudo Minecraft invalide pour le Remplaçant 1 : **${pseudoRempl1}**\nUniquement lettres, chiffres et underscores (3-16 caractères).` })

      const data = {
        id: step1.tempId,
        jeu: 'Minecraft',
        nomEquipe: step1.nomEquipe,
        statut: 'en_attente',
        capitaine: step1.capitaine,
        joueurs: [
          { discordId: step1.idT2, pseudo: pseudoT2, role: 'Titulaire 2' },
          { discordId: step1.idT3, pseudo: pseudoT3, role: 'Titulaire 3' },
          { discordId: step1.idRempl1, pseudo: pseudoRempl1, role: 'Remplaçant 1' },
          ...(idRempl2 ? [{ discordId: idRempl2, role: 'Remplaçant 2' }] : []),
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
          .setTitle(`📋 Nouvelle inscription — ${data.nomEquipe} (Minecraft)`)
          .setDescription(
            `**Capitaine :** <@${data.capitaine.discordId}> (MC: ${data.capitaine.pseudo})\n` +
            `**Titulaire 2 :** <@${step1.idT2}> (MC: ${pseudoT2})\n` +
            `**Titulaire 3 :** <@${step1.idT3}> (MC: ${pseudoT3})\n` +
            `**Remplaçant 1 :** <@${step1.idRempl1}> (MC: ${pseudoRempl1})\n` +
            (idRempl2 ? `**Remplaçant 2 :** <@${idRempl2}>\n` : '') +
            (idCoach ? `**Coach :** <@${idCoach}>\n` : '') +
            `\n⚠️ Vérifier que tous les joueurs possèdent un compte Minecraft Java officiel.`
          )
          .setColor('#5C8A00')
          .setTimestamp()],
        components: [rowValidation]
      })

      await interaction.editReply({
        content:
          `✅ **Inscription complète envoyée au staff !**\n\n` +
          `**Équipe :** ${data.nomEquipe} — Minecraft Java\n` +
          `**Capitaine :** <@${data.capitaine.discordId}> (${data.capitaine.pseudo})\n` +
          `**Titulaire 2 :** <@${step1.idT2}> (${pseudoT2})\n` +
          `**Titulaire 3 :** <@${step1.idT3}> (${pseudoT3})\n` +
          `**Remplaçant 1 :** <@${step1.idRempl1}> (${pseudoRempl1})\n` +
          (idRempl2 ? `**Remplaçant 2 :** <@${idRempl2}>\n` : '') +
          (idCoach ? `**Coach :** <@${idCoach}>\n` : '') +
          `\nVotre inscription est en attente de validation 🙏`
      })
    } catch (e) {
      console.error('Erreur modal MC 2:', e.message)
      await interaction.editReply({ content: 'Une erreur s\'est produite. Réessaie.' })
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
          .setTitle('🔍 Recherche équipe — Brawl Stars')
          .setDescription(`**Joueur :** <@${interaction.user.id}>\n**Pseudo :** ${pseudoBS}\n**Tag :** ${tagBS}\n\n**Présentation :** ${presentation}`)
          .setColor('#FF6B35').setTimestamp()]
      })
      await interaction.editReply({ content: '✅ Ton profil a été posté dans le canal de recherche d\'équipe !' })
    } catch (e) {
      await interaction.editReply({ content: 'Une erreur s\'est produite. Réessaie.' })
    }
  }

  // MODAL CHERCHE EQUIPIER MC
  if (interaction.isModalSubmit() && interaction.customId === 'modal_cherche_mc') {
    await interaction.deferReply({ ephemeral: true })
    try {
      const pseudoMC = interaction.fields.getTextInputValue('pseudo_mc')
      const presentation = interaction.fields.getTextInputValue('presentation')
      const chercheChannel = await client.channels.fetch(CHERCHE_EQUIPIER_CHANNEL_ID)
      await chercheChannel.send({
        embeds: [new EmbedBuilder()
          .setTitle('🔍 Recherche équipe — Minecraft')
          .setDescription(`**Joueur :** <@${interaction.user.id}>\n**Pseudo Minecraft Java :** ${pseudoMC}\n\n**Présentation :** ${presentation}`)
          .setColor('#5C8A00').setTimestamp()]
      })
      await interaction.editReply({ content: '✅ Ton profil a été posté dans le canal de recherche d\'équipe !' })
    } catch (e) {
      await interaction.editReply({ content: 'Une erreur s\'est produite. Réessaie.' })
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

      const role = await guild.roles.create({
        name: data.nomEquipe,
        color: data.jeu === 'Brawl Stars' ? '#00C3FF' : '#5C8A00',
        reason: `E-Series — Équipe ${data.nomEquipe}`
      })

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

      const category = await client.channels.fetch(ESERIES_CATEGORY_ID)
      const teamChannel = await guild.channels.create({
        name: `chat-${data.nomEquipe.toLowerCase().replace(/\s+/g, '-')}`,
        type: ChannelType.GuildText,
        parent: category,
        permissionOverwrites: [
          { id: guild.roles.everyone, deny: [PermissionsBitField.Flags.ViewChannel] },
          { id: role.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
        ]
      })

      await teamChannel.send({
        embeds: [new EmbedBuilder()
          .setTitle(`🏆 Bienvenue dans le chat de l'équipe ${data.nomEquipe} !`)
          .setDescription(
            `**Jeu :** ${data.jeu}\n` +
            `**Membres :** ${tousLesIds.map(id => `<@${id}>`).join(' ')}\n\n` +
            `Bonne chance pour la compétition ! 🎮`
          )
          .setColor(data.jeu === 'Brawl Stars' ? '#00C3FF' : '#5C8A00')]
      })

      const equipeChannel = await client.channels.fetch(EQUIPES_VALIDEES_CHANNEL_ID)
      await equipeChannel.send({
        embeds: [new EmbedBuilder()
          .setTitle(`✅ ${data.nomEquipe} — ${data.jeu}`)
          .setDescription(
            `**Capitaine :** <@${data.capitaine.discordId}>\n` +
            data.joueurs.map(j => `**${j.role} :** <@${j.discordId}>${j.pseudo ? ` (${j.pseudo})` : ''}${j.info ? ` (${j.info})` : ''}`).join('\n')
          )
          .setColor('#00C853').setTimestamp()]
      })

      data.statut = 'validée'
      data.roleId = role.id
      data.channelId = teamChannel.id
      inscriptions.set(id, data)
      await saveData()

      await interaction.message.edit({
        embeds: [new EmbedBuilder().setTitle(`✅ ${data.nomEquipe} validée`).setDescription(`Rôle et canal créés avec succès.`).setColor('#00C853')],
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
      embeds: [new EmbedBuilder().setTitle('❌ Inscription refusée').setColor('#FF0000')],
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
      await interaction.reply({ embeds: [new EmbedBuilder().setTitle(`Équipes inscrites (${list.length})`).setDescription(desc).setColor('#00C3FF')], ephemeral: true })
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
