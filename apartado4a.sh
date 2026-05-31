#!/bin/bash

# ==========================================================
# Script: apartado4a.sh
# Descripcion: Comprueba el espacio usado en los directorios
# personales /home de usuarios con UID > 500 y exporta a CSV
# los que superan el limite indicado.
# Requisito: debe ejecutarse como root.
# ==========================================================

LOGFILE="historial.log"

# ----------------------------------------------------------
# Escribe mensajes en el log con fecha y hora
# ----------------------------------------------------------
log_msg() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOGFILE"
}

# ----------------------------------------------------------
# Muestra la ayuda del script
# ----------------------------------------------------------
mostrar_ayuda() {
    echo "Uso:"
    echo "  $0 ficheroBase espacioMB salida.csv"
    echo "  $0 -help"
    echo
    echo "Ejemplo:"
    echo "  $0 base.txt 100 salida.csv"
    echo
    echo "Parametros:"
    echo "  ficheroBase : nombre de un fichero base"
    echo "  espacioMB   : limite en MB"
    echo "  salida.csv  : fichero CSV de salida"
}

# ----------------------------------------------------------
# Comprueba si el script lo ejecuta root
# ----------------------------------------------------------
comprobar_root() {
    if [ "$(id -u)" -ne 0 ]; then
        echo "ERROR: Este script solo puede ejecutarlo root."
        log_msg "ERROR: intento de ejecucion sin root"
        exit 1
    fi
}

# ----------------------------------------------------------
# Valida los parametros recibidos
# ----------------------------------------------------------
validar_parametros() {
    if [ "$1" = "-help" ]; then
        mostrar_ayuda
        exit 0
    fi

    if [ $# -ne 3 ]; then
        echo "ERROR: numero de parametros incorrecto."
        mostrar_ayuda
        log_msg "ERROR: numero de parametros incorrecto"
        exit 1
    fi

    FICHERO_BASE="$1"
    LIMITE_MB="$2"
    SALIDA_CSV="$3"

    # Guardamos el fichero base recibido como parametro
    # optenemos los datos de los directorios /etc/passwd y /home
    if [ -z "$FICHERO_BASE" ]; then
        echo "ERROR: el fichero base no puede estar vacio."
        log_msg "ERROR: fichero base vacio"
        exit 1
    fi

    # Se comprueba que el limite sea un numero entero
    if ! echo "$LIMITE_MB" | grep -Eq '^[0-9]+$'; then
        echo "ERROR: el segundo parametro debe ser numerico."
        log_msg "ERROR: limite en MB no numerico: $LIMITE_MB"
        exit 1
    fi
}

# ----------------------------------------------------------
# Prepara el CSV de salida y pregunta si debe sobrescribirlo
# ----------------------------------------------------------
preparar_csv() {
    if [ -f "$SALIDA_CSV" ]; then
        echo -n "El fichero $SALIDA_CSV ya existe. ¿Deseas sobrescribirlo? (s/n): "
        read RESPUESTA
        if [ "$RESPUESTA" != "s" ] && [ "$RESPUESTA" != "S" ]; then
            echo "Operacion cancelada."
            log_msg "Cancelada sobrescritura de $SALIDA_CSV"
            exit 0
        fi
    fi

    echo "Usuario,UID,Espacio(MB)" > "$SALIDA_CSV"
}

# ----------------------------------------------------------
# Recorre usuarios con UID > 500 usando awk y procesa
# solo los que tienen directorio /home
# ----------------------------------------------------------
procesar_usuarios() {
    LINEAS_PROCESADAS=0
    USUARIOS_LISTADOS=0

    while IFS=: read -r USUARIO _ ID_USUARIO _ _ HOME_USUARIO _; do
        if [ "$ID_USUARIO" -gt 500 ]; then
            LINEAS_PROCESADAS=$((LINEAS_PROCESADAS + 1))

            # Solo se consideran directorios personales bajo /home
            if [[ "$HOME_USUARIO" == /home/* ]] && [ -d "$HOME_USUARIO" ]; then

                # du -sm calcula el espacio ocupado en MB
                ESPACIO_MB=$(du -sm "$HOME_USUARIO" 2>>"$LOGFILE" | cut -f1)

                if [ -z "$ESPACIO_MB" ]; then
                    log_msg "ERROR: no se pudo calcular espacio para $USUARIO"
                    continue
                fi

                # Solo se exportan los usuarios que superan el limite
                if [ "$ESPACIO_MB" -gt "$LIMITE_MB" ]; then
                    echo "$USUARIO,$ID_USUARIO,$ESPACIO_MB" >> "$SALIDA_CSV"
                    USUARIOS_LISTADOS=$((USUARIOS_LISTADOS + 1))
                fi
            else
                log_msg "AVISO: usuario omitido por no tener home en /home: $USUARIO ($HOME_USUARIO)"
            fi
        fi
    done < <(awk -F: '$3>500 {print $1 ":" $2 ":" $3 ":" $4 ":" $5 ":" $6 ":" $7}' /etc/passwd)

    echo "Total lineas procesadas: $LINEAS_PROCESADAS"
    echo "Usuarios listados: $USUARIOS_LISTADOS"

    log_msg "Total lineas procesadas: $LINEAS_PROCESADAS"
    log_msg "Usuarios listados: $USUARIOS_LISTADOS"
}

# ----------------------------------------------------------
# Programa principal
# ----------------------------------------------------------

# Comprobamos permisos y parametros antes de procesar usuarios
comprobar_root
validar_parametros "$@"
preparar_csv
procesar_usuarios
