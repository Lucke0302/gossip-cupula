namespace GossipCupula.Api.Models;

/// <summary>
/// Compromisso fixado no calendário ("eventos").
/// <para>
/// Espelha o <c>eventSchema</c> de <c>frontend/src/types/index.ts</c>. O contrato
/// é <c>.strict()</c> do lado do front, então a serialização futura deve conter
/// exatamente <c>id</c>, <c>date</c>, <c>title</c>, <c>time</c>, <c>place</c>,
/// <c>description</c>, <c>color</c>, <c>authorName</c>, <c>goingCount</c>,
/// <c>isGoing</c> e <c>canEdit</c> — nada de <c>CreatedAt</c> nem
/// <c>CreatorId</c> saindo na resposta.
/// </para>
/// <para>
/// <b>Propriedade x assinatura:</b> <c>AuthorName</c> é só assinatura (opcional,
/// texto de exibição); quem manda na permissão de edição é o vínculo real
/// <c>CreatorId</c> → <c>Users</c>, que <b>nunca</b> é exposto no DTO.
/// </para>
/// </summary>
public class Event
{
    public Guid Id { get; set; }

    /// <summary>
    /// Data do evento. O grão é o <b>dia</b>: não existe hora aqui, e é por isso
    /// que o filtro por mês (<c>?month=YYYY-MM</c>) é um intervalo de datas.
    /// <para>
    /// <see cref="DateOnly"/> é mapeado nativamente pelo Npgsql para a coluna
    /// <c>date</c> do PostgreSQL — sem <c>DateTime</c> com hora zerada, que
    /// convidaria ordenação por minuto (o tipo de metadado que o resto do site
    /// evita).
    /// </para>
    /// </summary>
    public DateOnly Date { get; set; }

    public string Title { get; set; } = string.Empty;

    /// <summary>
    /// Horário no formato <c>"HH:mm"</c> (24h), ou <c>null</c> para "a confirmar".
    /// <para>
    /// <see cref="TimeOnly"/> mapeia para <c>time without time zone</c>. Nada de
    /// texto livre ("22h", "depois do jantar"): a tela manda sempre <c>"22:30"</c>,
    /// então o valor entra num tipo de hora sem parse defensivo.
    /// </para>
    /// </summary>
    public TimeOnly? Time { get; set; }

    /// <summary>
    /// Local do evento. Opcional na criação: vindo vazio, o service grava
    /// <c>"local em segredo"</c>.
    /// </summary>
    public string Place { get; set; } = string.Empty;

    /// <summary>
    /// Descrição. Não faz parte do corpo de criação do front (que manda só
    /// <c>date, title, time, place, color, signed</c>): nasce preenchida pelo
    /// service — <c>"marcado anonimamente. quem sabe, sabe."</c> por padrão.
    /// </summary>
    public string Description { get; set; } = string.Empty;

    /// <summary>
    /// Cor da estrelinha no calendário, em hexadecimal (ex.: <c>"#E86B9E"</c>).
    /// Uma das cinco do design — a lista fechada (<c>EVENT_COLORS</c>) é validada
    /// no DTO de entrada, não aqui, para não travar o contrato em coluna.
    /// </summary>
    public string Color { get; set; } = string.Empty;

    /// <summary>
    /// Assinatura do evento — ou <c>null</c>, que é o <b>padrão</b>.
    /// <para>
    /// Único ponto do site onde uma leitura carrega autoria, e só porque a pessoa
    /// escolheu assinar. <b>Regra do contrato: quando <c>signed</c> é <c>false</c>,
    /// o nome não é gravado.</b> O nome vem do token (claim do usuário), nunca do
    /// corpo: guardar o autor para omitir no JSON seria o mesmo vazamento adiado
    /// do <c>ownerUsername</c> dos posts.
    /// </para>
    /// <para>
    /// É assinatura, <b>não</b> propriedade: não identifica dono nenhum (por isso
    /// a edição não usa este campo). O vínculo de autoria real é o
    /// <see cref="CreatorId"/>. Desfixar (DELETE) continua aberto a qualquer
    /// pessoa da cúpula.
    /// </para>
    /// </summary>
    public string? AuthorName { get; set; }

    /// <summary>
    /// Usuário que criou o evento (FK opcional para <c>Users</c>).
    /// <para>
    /// É o vínculo de <b>propriedade</b> de verdade — a base de
    /// <c>canEdit</c> (Admin ou criador). É <b>opcional</b> por dois motivos:
    /// eventos anteriores a esta coluna não têm dono, e excluir um usuário no
    /// Admin <b>não</b> pode apagar o evento da cúpula (o vínculo vira
    /// <c>NULL</c>, e o evento passa a ser editável só por Admin).
    /// </para>
    /// <para>
    /// <b>Nunca serializado:</b> a identidade do criador é segredo só do backend.
    /// O que atravessa o DTO é apenas o booleano derivado <c>canEdit</c> — nada
    /// de <c>UserId</c> ou <c>CreatorId</c> na resposta.
    /// </para>
    /// </summary>
    public Guid? CreatorId { get; set; }

    /// <summary>
    /// Navegação para o usuário criador. Sem coleção inversa em
    /// <see cref="User"/> de propósito: nenhuma leitura precisa carregar "quais
    /// eventos eu criei", e o vínculo nunca é exposto.
    /// </summary>
    public User? Creator { get; set; }

    /// <summary>
    /// Quem confirmou presença ("estou indo") neste evento.
    /// <para>
    /// A relação existe no banco por dois motivos: impede confirmação duplicada
    /// (chave composta <c>EventId + UserId</c>) e permite ao servidor responder
    /// <c>isGoing</c> de quem pediu depois de um reload da página — sem linha,
    /// não há como saber se <b>esta</b> pessoa já confirmou.
    /// </para>
    /// <para>
    /// A privacidade é garantida na <b>omissão do DTO</b>, não na exclusão do
    /// banco: a resposta devolve só <c>goingCount</c> (a contagem) e
    /// <c>isGoing</c> do próprio usuário. Nenhum <c>UserId</c> sai daqui.
    /// </para>
    /// </summary>
    public ICollection<EventPresence> Presences { get; set; } = new List<EventPresence>();

    /// <summary>
    /// Gravado sempre com <c>DateTime.UtcNow</c>. Serve de desempate determinístico
    /// na listagem por data; <b>não</b> é serializado na resposta (o contrato de
    /// evento não tem timestamp).
    /// </summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
