import gleam/option.{type Option}

pub type Model {
  Model(notes: List(NoteSummary), open: Option(String))
}

pub type NoteSummary {
  NoteSummary(id: String, title: String)
}
