using System.Text;

namespace GossipCupula.Api.Services;

/// <summary>
/// Cursor opaco (base64url) para paginação keyset.
/// <para>
/// É opaco por convenção: o cliente só devolve a string que recebeu, nada de
/// <c>?page=2</c>, que exporia ordem e volume total. Duas posições são
/// suportadas:
/// </para>
/// <list type="bullet">
///   <item>a de <b>duas partes</b> — <c>(CreatedAt, Id)</c> —, usada por
///   comentários e posts, em que a ordem é <c>(CreatedAt DESC, Id DESC)</c>;</item>
///   <item>a de <b>três partes</b> — <c>(CreatedAt, Id, Index)</c> —, usada
///   pelas listagens "achatadas" (galeria e links), em que cada post pode
///   contribuir com mais de um item e o <c>Index</c> desempata dentro do post.</item>
/// </list>
/// <para>
/// Um cursor inválido é ignorado (a listagem recomeça do topo) em vez de
/// virar 400 — mesmo comportamento do adaptador de posts do front quando o
/// cursor some.
/// </para>
/// </summary>
public static class OpaqueCursor
{
    private const char Separator = '|';

    /// <summary>Posição do último item entregue numa lista sem índice.</summary>
    public readonly record struct CursorValue(DateTime CreatedAt, Guid Id);

    /// <summary>Posição do último item entregue numa lista achatada (com índice dentro do post).</summary>
    public readonly record struct IndexedCursorValue(DateTime CreatedAt, Guid Id, int Index);

    public static string Encode(DateTime createdAtUtc, Guid id) =>
        Encode($"{createdAtUtc.Ticks}{Separator}{id:N}");

    public static string Encode(DateTime createdAtUtc, Guid id, int index) =>
        Encode($"{createdAtUtc.Ticks}{Separator}{id:N}{Separator}{index}");

    public static bool TryDecode(string? cursor, out CursorValue value)
    {
        value = default;

        if (!TrySplit(cursor, expectedParts: 2, out var parts) ||
            !TryParsePosition(parts, out var createdAt, out var id))
        {
            return false;
        }

        value = new CursorValue(createdAt, id);
        return true;
    }

    public static bool TryDecode(string? cursor, out IndexedCursorValue value)
    {
        value = default;

        if (!TrySplit(cursor, expectedParts: 3, out var parts) ||
            !TryParsePosition(parts, out var createdAt, out var id) ||
            !int.TryParse(parts[2], out var index) ||
            index < 0)
        {
            return false;
        }

        value = new IndexedCursorValue(createdAt, id, index);
        return true;
    }

    private static bool TryParsePosition(string[] parts, out DateTime createdAt, out Guid id)
    {
        createdAt = default;
        id = default;

        if (!long.TryParse(parts[0], out var ticks) ||
            ticks < DateTime.MinValue.Ticks ||
            ticks > DateTime.MaxValue.Ticks)
        {
            return false;
        }

        if (!Guid.TryParseExact(parts[1], "N", out id))
        {
            return false;
        }

        createdAt = new DateTime(ticks, DateTimeKind.Utc);
        return true;
    }

    private static bool TrySplit(string? cursor, int expectedParts, out string[] parts)
    {
        parts = [];

        return !string.IsNullOrWhiteSpace(cursor) &&
               TryBase64UrlDecode(cursor, out var decoded) &&
               (parts = decoded.Split(Separator)).Length == expectedParts;
    }

    private static string Encode(string text) =>
        Convert.ToBase64String(Encoding.UTF8.GetBytes(text))
               .Replace('+', '-')
               .Replace('/', '_')
               .TrimEnd('=');

    private static bool TryBase64UrlDecode(string cursor, out string decoded)
    {
        decoded = string.Empty;

        try
        {
            var base64 = cursor.Replace('-', '+').Replace('_', '/');
            base64 = (base64.Length % 4) switch
            {
                2 => base64 + "==",
                3 => base64 + "=",
                _ => base64
            };

            decoded = Encoding.UTF8.GetString(Convert.FromBase64String(base64));
            return true;
        }
        catch (FormatException)
        {
            return false;
        }
    }
}
