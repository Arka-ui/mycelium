import gleam/dict.{type Dict}
import gleam/erlang/process.{type Subject}
import gleam/option.{type Option, None, Some}
import gleam/otp/actor

pub type Locale {
  En
  Fr
}

pub type Message {
  Translate(key: String, reply: Subject(String))
  SetLocale(locale: Locale)
  GetLocale(reply: Subject(Locale))
}

type State {
  State(locale: Locale, en: Dict(String, String), fr: Dict(String, String))
}

pub fn start_link() -> Result(actor.Started(Subject(Message)), actor.StartError) {
  actor.new(State(locale: En, en: en_strings(), fr: fr_strings()))
  |> actor.on_message(handle)
  |> actor.start
}

pub fn t(subject: Subject(Message), key: String) -> String {
  process.call(subject, 1000, fn(reply) { Translate(key, reply) })
}

pub fn set_locale(subject: Subject(Message), locale: Locale) -> Nil {
  process.send(subject, SetLocale(locale))
}

pub fn get_locale(subject: Subject(Message)) -> Locale {
  process.call(subject, 1000, fn(reply) { GetLocale(reply) })
}

fn handle(state: State, msg: Message) -> actor.Next(State, Message) {
  case msg {
    Translate(key:, reply:) -> {
      let table = case state.locale {
        En -> state.en
        Fr -> state.fr
      }
      let value = case lookup(table, key) {
        Some(v) -> v
        None ->
          case lookup(state.en, key) {
            Some(v) -> v
            None -> key
          }
      }
      process.send(reply, value)
      actor.continue(state)
    }
    SetLocale(locale:) -> actor.continue(State(..state, locale: locale))
    GetLocale(reply:) -> {
      process.send(reply, state.locale)
      actor.continue(state)
    }
  }
}

fn lookup(d: Dict(String, String), k: String) -> Option(String) {
  case dict.get(d, k) {
    Ok(v) -> Some(v)
    Error(_) -> None
  }
}

fn en_strings() -> Dict(String, String) {
  dict.from_list([
    #("app.title", "Mycelium"),
    #("sidebar.new_note", "+ New Note"),
    #("editor.placeholder", "Start writing..."),
    #("editor.untitled", "Untitled"),
    #("editor.empty", "Select a note from the sidebar."),
    #("settings.title", "Settings"),
    #("settings.theme.label", "Theme"),
    #("settings.theme.dark", "Dark"),
    #("settings.theme.light", "Light"),
    #("settings.theme.high_contrast", "High contrast"),
    #("settings.language.label", "Language"),
    #("settings.language.en", "English"),
    #("settings.language.fr", "Français"),
    #("ring.title", "Ring & devices"),
    #("ring.invite", "Invite a device"),
    #("ring.passphrase_prompt", "Enter pairing passphrase"),
    #("ring.add_device", "Add device"),
    #("ring.devices_in_ring", "Devices in ring"),
    #("search.placeholder", "Search notes..."),
    #("search.semantic", "Semantic"),
    #("search.lexical", "Lexical"),
    #("search.hybrid", "Hybrid"),
    #("plugins.title", "Plugins"),
    #("plugins.install", "Install plugin"),
    #("plugins.installed", "Installed"),
  ])
}

fn fr_strings() -> Dict(String, String) {
  dict.from_list([
    #("app.title", "Mycelium"),
    #("sidebar.new_note", "+ Nouvelle note"),
    #("editor.placeholder", "Commencez à écrire..."),
    #("editor.untitled", "Sans titre"),
    #("editor.empty", "Sélectionnez une note dans la barre latérale."),
    #("settings.title", "Paramètres"),
    #("settings.theme.label", "Thème"),
    #("settings.theme.dark", "Sombre"),
    #("settings.theme.light", "Clair"),
    #("settings.theme.high_contrast", "Contraste élevé"),
    #("settings.language.label", "Langue"),
    #("settings.language.en", "English"),
    #("settings.language.fr", "Français"),
    #("ring.title", "Anneau & appareils"),
    #("ring.invite", "Inviter un appareil"),
    #("ring.passphrase_prompt", "Saisissez la phrase de jumelage"),
    #("ring.add_device", "Ajouter l'appareil"),
    #("ring.devices_in_ring", "Appareils dans l'anneau"),
    #("search.placeholder", "Rechercher des notes..."),
    #("search.semantic", "Sémantique"),
    #("search.lexical", "Lexical"),
    #("search.hybrid", "Hybride"),
    #("plugins.title", "Modules"),
    #("plugins.install", "Installer un module"),
    #("plugins.installed", "Installés"),
  ])
}
