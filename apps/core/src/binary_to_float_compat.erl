-module(binary_to_float_compat).
-export([parse/1]).

parse(S) ->
    Bin = unicode:characters_to_binary(S),
    Trimmed = string:trim(Bin),
    case Trimmed of
        <<>> -> {error, nil};
        _ ->
            try
                {ok, binary_to_float(Trimmed)}
            catch
                error:badarg ->
                    try
                        N = binary_to_integer(Trimmed),
                        {ok, float(N)}
                    catch
                        error:badarg -> {error, nil}
                    end
            end
    end.
