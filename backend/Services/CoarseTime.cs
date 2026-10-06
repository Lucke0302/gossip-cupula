namespace GossipCupula.Api.Services;

/// <summary>
/// Arredonda timestamps para a HORA cheia em UTC.
/// <para>
/// É regra de <b>anonimato</b>, não de formatação: um instante com precisão
/// de segundos cruzado com o horário de acesso denunciaria quem publicou
/// ("foi quem saiu da mesa 23h47"). O front valida exatamente isso
/// (<c>coarseTimestampSchema</c>) e rejeita o valor se vier "cheio".
/// </para>
/// </summary>
public static class CoarseTime
{
    public static DateTime ToHourUtc(DateTime value)
    {
        var utc = value.Kind switch
        {
            DateTimeKind.Utc => value,
            DateTimeKind.Local => value.ToUniversalTime(),
            _ => DateTime.SpecifyKind(value, DateTimeKind.Utc)
        };

        return new DateTime(utc.Year, utc.Month, utc.Day, utc.Hour, 0, 0, DateTimeKind.Utc);
    }
}
