package kz.healthcare.platform.auth.domain.exceptions;

import kz.healthcare.platform.shared.exception.BusinessException;
import org.springframework.http.HttpStatus;

public class TokenExpiredException extends BusinessException {

    public TokenExpiredException() {
        super("Токен истёк или отозван");
    }

    @Override
    public HttpStatus getStatus() {
        return HttpStatus.UNAUTHORIZED;
    }
}
