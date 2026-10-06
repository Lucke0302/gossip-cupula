using System.ComponentModel.DataAnnotations;

namespace GossipCupula.Api.DTOs.Events;

/// <summary>
/// Corpo do <c>PUT /api/events/{id}</c> — os três campos mutáveis de um evento
/// já fixado: <c>name</c>, <c>date</c> e <c>location</c>.
/// <para>
/// É um DTO enxuto de propósito: só o que a regra de negócio permite alterar.
/// <c>time</c>, <c>color</c>, <c>description</c> e a assinatura
/// (<c>authorName</c>) ficam de fora — o serviço não os toca.
/// </para>
/// <para>
/// Os nomes seguem o pedido de produto (<c>name</c>/<c>location</c>); no banco
/// eles correspondem a <c>Events.Title</c> e <c>Events.Place</c>. Os limites de
/// tamanho são os mesmos da criação, para o contrato não ter duas réguas.
/// </para>
/// </summary>
public class UpdateEventDto : IValidatableObject
{
    /// <summary>Novo nome do evento. Mesmos limites do título na criação.</summary>
    [Required(ErrorMessage = "O nome é obrigatório.")]
    [StringLength(
        CreateEventRequestDto.MaxTitleLength,
        MinimumLength = CreateEventRequestDto.MinTitleLength,
        ErrorMessage = "O nome deve ter entre 3 e 120 caracteres.")]
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Nova data do evento. Mesmo grão da entidade (<see cref="DateOnly"/> = dia,
    /// sem hora): serializa em <c>"YYYY-MM-DD"</c>, exatamente o formato do resto
    /// do contrato de eventos — um <see cref="DateTime"/> tenderia a carregar hora
    /// (e fuso) que a coluna <c>date</c> não guarda.
    /// </summary>
    public DateOnly Date { get; set; }

    /// <summary>
    /// Novo local. Vazio vira o fallback do contrato ("local em segredo"), como
    /// na criação — a coluna é <c>varchar(120)</c> e não aceita nulo.
    /// </summary>
    [StringLength(
        CreateEventRequestDto.MaxPlaceLength,
        ErrorMessage = "O local deve ter no máximo 120 caracteres.")]
    public string Location { get; set; } = string.Empty;

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        // [Required] barra vazio, mas deixa passar nome só com espaços — e o
        // front manda o nome já com trim.
        if (string.IsNullOrWhiteSpace(Name))
        {
            yield return new ValidationResult("O nome é obrigatório.", [nameof(Name)]);
        }

        // Sem a data no corpo, o binder deixa o default (01/01/0001): não é uma
        // data de calendário válida, então barra aqui — não existe
        // [Range]/[Required] que pegue um valor-padrão de DateOnly.
        if (Date == default)
        {
            yield return new ValidationResult("A data é obrigatória.", [nameof(Date)]);
        }
    }
}
