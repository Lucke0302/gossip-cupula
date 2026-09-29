namespace GossipCupula.Api.DTOs.Common;

/// <summary>
/// Envelope de listagem paginada por cursor opaco.
/// <para>
/// O formato na rede é exatamente <c>{ "items", "nextCursor" }</c> — o mesmo
/// que o front espera (<c>frontend/src/types/index.ts</c>, <c>pageSchema</c>,
/// que é <c>.strict()</c>). Nada de <c>totalCount</c>/<c>page</c>: além de
/// serem campos extras (e quebrarem a validação do front), o total exporia
/// o volume de comentários de cada post.
/// </para>
/// </summary>
public class Page<T>
{
    public IReadOnlyList<T> Items { get; init; } = [];

    /// <summary>
    /// Cursor opaco da próxima página (mão única: o cliente só devolve o que
    /// recebeu). <c>null</c> significa que não há mais itens.
    /// </summary>
    public string? NextCursor { get; init; }
}
