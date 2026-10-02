using System.ComponentModel.DataAnnotations;
using System.Diagnostics.CodeAnalysis;
using System.Globalization;

namespace GossipCupula.Api.DTOs.Events;

/// <summary>
/// Corpo do <c>POST /api/events</c> — exatamente o que o front envia
/// (<c>createEventSchema</c> em <c>frontend/src/types/index.ts</c>):
/// <c>{ date, title, time, place, color, signed }</c>.
/// <para>
/// Não existe campo de autor no payload. <c>signed</c> é só a <b>intenção</b>
/// de assinar; quem resolve o nome é o serviço, a partir do token de quem
/// está logado. Aceitar o nome no corpo deixaria qualquer um assinar como
/// qualquer pessoa.
/// </para>
/// </summary>
public class CreateEventRequestDto : IValidatableObject
{
    /// <summary>Formato do campo <see cref="Date"/>, o mesmo do front (grão = dia).</summary>
    public const string DateFormat = "yyyy-MM-dd";

    /// <summary>Formato do campo <see cref="Time"/> (24h, hora cheia ou meia hora).</summary>
    public const string TimeFormat = "HH:mm";

    /// <summary>Título mínimo: "conta pelo menos o que vai rolar".</summary>
    public const int MinTitleLength = 3;

    /// <summary>Alinhado à coluna <c>Events.Title</c>.</summary>
    public const int MaxTitleLength = 120;

    /// <summary>Alinhado à coluna <c>Events.Place</c>.</summary>
    public const int MaxPlaceLength = 120;

    /// <summary>
    /// As cinco cores do design (<c>EVENT_COLORS</c> no front) — lista fechada.
    /// Sem isso, o cliente poderia gravar qualquer string na coluna
    /// <c>varchar(7)</c> e a estrelinha sairia do padrão visual do canvas.
    /// </summary>
    public static readonly IReadOnlyList<string> AllowedColors =
    [
        "#E86B9E",
        "#E8763A",
        "#E8D44D",
        "#6BB9E8",
        "#8DC63F"
    ];

    [Required(ErrorMessage = "O título é obrigatório.")]
    [StringLength(MaxTitleLength, MinimumLength = MinTitleLength,
        ErrorMessage = "O título deve ter entre 3 e 120 caracteres.")]
    public string Title { get; set; } = string.Empty;

    /// <summary>Data do evento em <c>YYYY-MM-DD</c>, sem hora.</summary>
    [Required(ErrorMessage = "A data é obrigatória.")]
    public string Date { get; set; } = string.Empty;

    /// <summary>
    /// Horário <c>"HH:mm"</c> ou <c>null</c> (opcional: fixar uma estrelinha
    /// tem que continuar rápido). <c>null</c> significa "a confirmar".
    /// </summary>
    public string? Time { get; set; }

    /// <summary>Local. Opcional — vindo vazio, o serviço grava "local em segredo".</summary>
    public string? Place { get; set; }

    /// <summary>Uma das <see cref="AllowedColors"/>.</summary>
    [Required(ErrorMessage = "A cor é obrigatória.")]
    public string Color { get; set; } = string.Empty;

    /// <summary>
    /// Assinar o evento com o próprio apelido. Padrão: não. Quando <c>false</c>,
    /// a autoria <b>não</b> é gravada.
    /// </summary>
    public bool Signed { get; set; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        // [Required] barra vazio, mas deixa passar título só com espaços — e o
        // front manda o título já com trim.
        if (string.IsNullOrWhiteSpace(Title))
        {
            yield return new ValidationResult(
                "Conta pelo menos o que vai rolar.",
                [nameof(Title)]);
        }

        // Formato do front E data real: "2026-02-31" casa com o regex do
        // cliente, mas não existe no calendário.
        if (!TryParseDate(Date, out _))
        {
            yield return new ValidationResult(
                $"A data deve estar no formato {DateFormat} e ser uma data válida.",
                [nameof(Date)]);
        }

        // Opcional, mas quando vem não pode ser texto livre: a tela só oferece
        // a lista de meia em meia hora.
        if (!string.IsNullOrWhiteSpace(Time) && !TryParseTime(Time, out _))
        {
            yield return new ValidationResult(
                $"O horário deve estar no formato {TimeFormat} (24h).",
                [nameof(Time)]);
        }

        if (Place is not null && Place.Trim().Length > MaxPlaceLength)
        {
            yield return new ValidationResult(
                $"O local deve ter no máximo {MaxPlaceLength} caracteres.",
                [nameof(Place)]);
        }

        if (!AllowedColors.Contains(Color, StringComparer.OrdinalIgnoreCase))
        {
            yield return new ValidationResult(
                "Escolha uma das cores do calendário.",
                [nameof(Color)]);
        }
    }

    /// <summary>
    /// Converte <paramref name="value"/> em <see cref="DateOnly"/> usando
    /// estritamente <see cref="DateFormat"/>. Compartilhado com o serviço para
    /// o formato existir num lugar só.
    /// </summary>
    public static bool TryParseDate(string? value, [NotNullWhen(true)] out DateOnly date) =>
        DateOnly.TryParseExact(value, DateFormat, CultureInfo.InvariantCulture, DateTimeStyles.None, out date);

    /// <summary>
    /// Converte <paramref name="value"/> em <see cref="TimeOnly"/> usando
    /// estritamente <see cref="TimeFormat"/>.
    /// </summary>
    public static bool TryParseTime(string? value, out TimeOnly time) =>
        TimeOnly.TryParseExact(value, TimeFormat, CultureInfo.InvariantCulture, DateTimeStyles.None, out time);
}
